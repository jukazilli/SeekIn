import { plannerInputSchema, type PlannerInput } from "./planner-contracts";

const MINUTE_MS = 60_000;

type Interval = {
  start: number;
  end: number;
};

export type OperationalWindow = {
  date: string;
  startsAt: string;
  endsAt: string;
  minutes: number;
};

export type CapacityDay = {
  date: string;
  grossMinutes: number;
  operationalMinutes: number;
  reservedMinutes: number;
  netMinutes: number;
};

export type CapacityWeek = {
  weekStartDate: string;
  grossMinutes: number;
  operationalMinutes: number;
  reservedMinutes: number;
  netMinutes: number;
};

export type CapacitySummary = {
  days: CapacityDay[];
  weeks: CapacityWeek[];
  totals: Omit<CapacityWeek, "weekStartDate">;
};

export type CapacityOptions = {
  availableUntil?: string;
};

function isoDateAtOffset(date: string, offset: number): string {
  const instant = new Date(`${date}T00:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() + offset);
  return instant.toISOString().slice(0, 10);
}

function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function weekStart(date: string): string {
  const weekday = dayOfWeek(date);
  return isoDateAtOffset(date, -(weekday === 0 ? 6 : weekday - 1));
}

function zonedParts(instant: number, timeZone: string): number[] {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return [
    value("year"),
    value("month"),
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  ];
}

function localInstant(date: string, time: string, timeZone: string): number {
  const desired = [...date.split("-"), ...time.split(":")].map(Number);
  const desiredAsUtc = Date.UTC(
    desired[0]!,
    desired[1]! - 1,
    desired[2]!,
    desired[3]!,
    desired[4]!,
    desired[5]!,
  );
  let candidate = desiredAsUtc;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = zonedParts(candidate, timeZone);
    const actualAsUtc = Date.UTC(
      actual[0]!,
      actual[1]! - 1,
      actual[2]!,
      actual[3]!,
      actual[4]!,
      actual[5]!,
    );
    const correction = desiredAsUtc - actualAsUtc;
    candidate += correction;
    if (correction === 0) break;
  }

  const matchesDesired = (instant: number) =>
    zonedParts(instant, timeZone).every(
      (part, index) => part === desired[index],
    );
  if (!matchesDesired(candidate)) {
    throw new RangeError(
      `Horário local inexistente em ${timeZone}: ${date} ${time}`,
    );
  }
  let hasAlternative = false;
  for (let offsetMinutes = -180; offsetMinutes <= 180; offsetMinutes += 15) {
    if (
      offsetMinutes !== 0 &&
      matchesDesired(candidate + offsetMinutes * MINUTE_MS)
    ) {
      hasAlternative = true;
      break;
    }
  }
  if (hasAlternative) {
    throw new RangeError(
      `Horário local ambíguo em ${timeZone}: ${date} ${time}`,
    );
  }

  return candidate;
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  const ordered = intervals
    .filter(({ start, end }) => start < end)
    .sort((left, right) => left.start - right.start || left.end - right.end);
  const merged: Interval[] = [];

  for (const interval of ordered) {
    const previous = merged.at(-1);
    if (!previous || interval.start > previous.end) {
      merged.push({ ...interval });
    } else {
      previous.end = Math.max(previous.end, interval.end);
    }
  }

  return merged;
}

function subtractIntervals(
  windows: Interval[],
  unavailable: Interval[],
): Interval[] {
  return windows.flatMap((window) => {
    let fragments = [window];
    for (const occupied of unavailable) {
      fragments = fragments.flatMap((fragment) => {
        if (occupied.end <= fragment.start || occupied.start >= fragment.end) {
          return [fragment];
        }
        return [
          {
            start: fragment.start,
            end: Math.min(fragment.end, occupied.start),
          },
          { start: Math.max(fragment.start, occupied.end), end: fragment.end },
        ].filter(({ start, end }) => start < end);
      });
    }
    return fragments;
  });
}

function overlapMinutes(windows: Interval[], unavailable: Interval[]): number {
  let milliseconds = 0;
  for (const window of windows) {
    for (const occupied of unavailable) {
      milliseconds += Math.max(
        0,
        Math.min(window.end, occupied.end) -
          Math.max(window.start, occupied.start),
      );
    }
  }
  return Math.floor(milliseconds / MINUTE_MS);
}

function sumMinutes(intervals: Interval[]): number {
  return Math.floor(
    intervals.reduce((total, item) => total + item.end - item.start, 0) /
      MINUTE_MS,
  );
}

function addCapacity<T extends Omit<CapacityWeek, "weekStartDate">>(
  target: T,
  source: Omit<CapacityDay, "date">,
): void {
  target.grossMinutes += source.grossMinutes;
  target.operationalMinutes += source.operationalMinutes;
  target.reservedMinutes += source.reservedMinutes;
  target.netMinutes += source.netMinutes;
}

function resolveCutoff(options: CapacityOptions): number {
  const cutoff = options.availableUntil
    ? Date.parse(options.availableUntil)
    : Number.POSITIVE_INFINITY;
  if (Number.isNaN(cutoff)) {
    throw new RangeError("availableUntil deve ser um instante ISO válido");
  }
  return cutoff;
}

function unavailableIntervals(input: PlannerInput): Interval[] {
  return mergeIntervals([
    ...input.blocks.map(({ startsAt, endsAt }) => ({
      start: Date.parse(startsAt),
      end: Date.parse(endsAt),
    })),
    ...input.protectedSessions.map(({ startsAt, endsAt }) => ({
      start: Date.parse(startsAt),
      end: Date.parse(endsAt),
    })),
  ]);
}

function availabilityForDay(
  input: PlannerInput,
  date: string,
  generatedAt: number,
  availableUntil: number,
): Interval[] {
  return mergeIntervals(
    input.availability
      .filter(({ dayOfWeek: weekday }) => weekday === dayOfWeek(date))
      .map(({ startLocal, endLocal }) => ({
        start: Math.max(
          generatedAt,
          localInstant(date, startLocal, input.timezone),
        ),
        end: Math.min(
          availableUntil,
          localInstant(date, endLocal, input.timezone),
        ),
      })),
  );
}

export function listOperationalWindows(
  rawInput: PlannerInput,
  options: CapacityOptions = {},
): OperationalWindow[] {
  const input = plannerInputSchema.parse(rawInput);
  const availableUntil = resolveCutoff(options);
  const generatedAt = Date.parse(input.generatedAt);
  const unavailable = unavailableIntervals(input);
  const result: OperationalWindow[] = [];

  for (
    let date = input.horizonStartDate;
    date <= input.horizonEndDate;
    date = isoDateAtOffset(date, 1)
  ) {
    const operational = subtractIntervals(
      availabilityForDay(input, date, generatedAt, availableUntil),
      unavailable,
    );
    result.push(
      ...operational.map(({ start, end }) => ({
        date,
        startsAt: new Date(start).toISOString(),
        endsAt: new Date(end).toISOString(),
        minutes: Math.floor((end - start) / MINUTE_MS),
      })),
    );
  }
  return result;
}

/** Calculates capacity only; session partitioning and allocation belong to later planner stages. */
export function calculateCapacity(
  rawInput: PlannerInput,
  options: CapacityOptions = {},
): CapacitySummary {
  const input = plannerInputSchema.parse(rawInput);
  const availableUntil = resolveCutoff(options);
  const unavailable = unavailableIntervals(input);
  const generatedAt = Date.parse(input.generatedAt);
  const days: CapacityDay[] = [];

  for (
    let date = input.horizonStartDate;
    date <= input.horizonEndDate;
    date = isoDateAtOffset(date, 1)
  ) {
    const windows = availabilityForDay(
      input,
      date,
      generatedAt,
      availableUntil,
    );
    const grossMinutes = sumMinutes(windows);
    const unavailableMinutes = overlapMinutes(windows, unavailable);
    const operationalMinutes = Math.max(0, grossMinutes - unavailableMinutes);
    const netMinutes = Math.floor(
      operationalMinutes * (1 - input.preferences.reservePercent / 100),
    );

    days.push({
      date,
      grossMinutes,
      operationalMinutes,
      reservedMinutes: operationalMinutes - netMinutes,
      netMinutes,
    });
  }

  const weeksByStart = new Map<string, CapacityWeek>();
  const totals = {
    grossMinutes: 0,
    operationalMinutes: 0,
    reservedMinutes: 0,
    netMinutes: 0,
  };
  for (const day of days) {
    const weekStartDate = weekStart(day.date);
    const week = weeksByStart.get(weekStartDate) ?? {
      weekStartDate,
      grossMinutes: 0,
      operationalMinutes: 0,
      reservedMinutes: 0,
      netMinutes: 0,
    };
    addCapacity(week, day);
    addCapacity(totals, day);
    weeksByStart.set(weekStartDate, week);
  }

  return { days, weeks: [...weeksByStart.values()], totals };
}
