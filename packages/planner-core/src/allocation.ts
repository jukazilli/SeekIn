import {
  calculateCapacity,
  listOperationalWindows,
  type OperationalWindow,
} from "./capacity";
import { plannerInputSchema, type PlannerInput } from "./planner-contracts";
import {
  rankActivities,
  type PriorityFactorCode,
  type RankedActivity,
} from "./priority";
import { partitionEffort } from "./session-partition";

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

type MutableWindow = OperationalWindow & { cursor: number; end: number };

export type AllocatedSession = {
  ordinal: number;
  activityId: string;
  startsAt: string;
  endsAt: string;
  plannedMinutes: number;
  rationaleCode: Exclude<PriorityFactorCode, "stable_id">;
  usesDeadlineBuffer: boolean;
};

export type AllocationResult = {
  sessions: AllocatedSession[];
  unallocated: Array<{ activityId: string; minutes: number }>;
};

function publicRationale(
  ranked: RankedActivity,
): Exclude<PriorityFactorCode, "stable_id"> {
  return ranked.decidingFactor === "stable_id"
    ? "earliest_deadline"
    : ranked.decidingFactor;
}

function findWindow(
  windows: MutableWindow[],
  duration: number,
  cutoff: number,
  dayBudgets: Map<string, number>,
  activityLoad: Map<string, number>,
): MutableWindow | undefined {
  return windows
    .filter(
      (window) =>
        window.cursor + duration * MINUTE_MS <= Math.min(window.end, cutoff) &&
        (dayBudgets.get(window.date) ?? 0) >= duration,
    )
    .sort(
      (left, right) =>
        (activityLoad.get(left.date) ?? 0) -
          (activityLoad.get(right.date) ?? 0) ||
        left.date.localeCompare(right.date) ||
        left.cursor - right.cursor,
    )[0];
}

function largestSlot(
  windows: MutableWindow[],
  cutoff: number,
  dayBudgets: Map<string, number>,
): number {
  return windows.reduce((largest, window) => {
    const continuous = Math.floor(
      (Math.min(window.end, cutoff) - window.cursor) / MINUTE_MS,
    );
    return Math.max(
      largest,
      Math.min(continuous, dayBudgets.get(window.date) ?? 0),
    );
  }, 0);
}

function splitToFit(
  duration: number,
  largest: number,
  minimum: number,
): number[] | null {
  if (largest < minimum || largest >= duration) return null;
  const parts = partitionEffort({
    remainingMinutes: duration,
    preferredSessionMinutes: largest,
    minimumSessionMinutes: minimum,
  });
  return parts.every((part) => part <= largest) ? parts : null;
}

/** Allocates ranked, partitioned activities into deterministic continuous windows. */
export function allocateSessions(rawInput: PlannerInput): AllocationResult {
  const input = plannerInputSchema.parse(rawInput);
  const capacity = calculateCapacity(input);
  const dayBudgets = new Map(
    capacity.days.map((day) => [
      day.date,
      Math.min(day.netMinutes, input.preferences.dailyLimitMinutes),
    ]),
  );
  const windows: MutableWindow[] = listOperationalWindows(input).map(
    (window) => ({
      ...window,
      cursor: Date.parse(window.startsAt),
      end: Date.parse(window.endsAt),
    }),
  );
  const sessions: AllocatedSession[] = [];
  const unallocated: AllocationResult["unallocated"] = [];

  for (const ranked of rankActivities(input)) {
    const activity = input.activities.find(
      ({ id }) => id === ranked.activityId,
    )!;
    const deadline = Date.parse(activity.deadlineAt);
    const preferredCutoff = deadline - DAY_MS;
    const activityLoad = new Map<string, number>();
    const queue = partitionEffort({
      remainingMinutes: activity.remainingMinutes,
      preferredSessionMinutes: input.preferences.preferredSessionMinutes,
      minimumSessionMinutes: input.preferences.minimumSessionMinutes,
    });

    while (queue.length > 0) {
      const duration = queue.shift()!;
      let selected = findWindow(
        windows,
        duration,
        preferredCutoff,
        dayBudgets,
        activityLoad,
      );
      let usesDeadlineBuffer = true;

      if (!selected) {
        const parts = splitToFit(
          duration,
          largestSlot(windows, preferredCutoff, dayBudgets),
          input.preferences.minimumSessionMinutes,
        );
        if (parts) {
          queue.unshift(...parts);
          continue;
        }
        selected = findWindow(
          windows,
          duration,
          deadline,
          dayBudgets,
          activityLoad,
        );
        usesDeadlineBuffer = false;
      }
      if (!selected) {
        const parts = splitToFit(
          duration,
          largestSlot(windows, deadline, dayBudgets),
          input.preferences.minimumSessionMinutes,
        );
        if (parts) {
          queue.unshift(...parts);
          continue;
        }
        unallocated.push({
          activityId: activity.id,
          minutes: duration + queue.reduce((total, part) => total + part, 0),
        });
        break;
      }

      const start = selected.cursor;
      const end = start + duration * MINUTE_MS;
      selected.cursor = end;
      dayBudgets.set(
        selected.date,
        (dayBudgets.get(selected.date) ?? 0) - duration,
      );
      activityLoad.set(
        selected.date,
        (activityLoad.get(selected.date) ?? 0) + duration,
      );
      sessions.push({
        ordinal: sessions.length + 1,
        activityId: activity.id,
        startsAt: new Date(start).toISOString(),
        endsAt: new Date(end).toISOString(),
        plannedMinutes: duration,
        rationaleCode: publicRationale(ranked),
        usesDeadlineBuffer,
      });
    }
  }

  return { sessions, unallocated };
}
