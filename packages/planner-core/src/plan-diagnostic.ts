import { allocateSessions, type AllocatedSession } from "./allocation";
import { calculateCapacity, listOperationalWindows } from "./capacity";
import { plannerInputSchema, type PlannerInput } from "./planner-contracts";
import { analyzeRisk, type ActivityRisk } from "./risk-analysis";

const MINUTE_MS = 60_000;

export type PlanFeasibility = "feasible" | "partial" | "infeasible";

export type PlanConflict = {
  code: "insufficient_capacity" | "protected_capacity";
  firstAffectedDeadlineAt: string;
  deficitMinutes: number;
  largestAvailableWindowMinutes: number;
  activityIds: string[];
};

export type PlanDraft = {
  feasibility: PlanFeasibility;
  sessions: AllocatedSession[];
  activityRisks: ActivityRisk[];
  unallocated: Array<{ activityId: string; minutes: number }>;
  conflicts: PlanConflict[];
};

type Interval = { start: number; end: number };

function subtract(interval: Interval, occupied: Interval[]): Interval[] {
  return occupied.reduce<Interval[]>(
    (fragments, item) => {
      return fragments.flatMap((fragment) => {
        if (item.end <= fragment.start || item.start >= fragment.end) {
          return [fragment];
        }
        return [
          { start: fragment.start, end: Math.min(fragment.end, item.start) },
          { start: Math.max(fragment.start, item.end), end: fragment.end },
        ].filter(({ start, end }) => start < end);
      });
    },
    [interval],
  );
}

function largestRemainingWindow(
  input: PlannerInput,
  sessions: AllocatedSession[],
  deadlineAt: string,
): number {
  const capacity = calculateCapacity(input, { availableUntil: deadlineAt });
  const dayBudgets = new Map(
    capacity.days.map((day) => [
      day.date,
      Math.min(day.netMinutes, input.preferences.dailyLimitMinutes),
    ]),
  );
  const windows = listOperationalWindows(input, { availableUntil: deadlineAt });

  for (const session of sessions) {
    const start = Date.parse(session.startsAt);
    const end = Date.parse(session.endsAt);
    const window = windows.find(
      (candidate) =>
        Date.parse(candidate.startsAt) <= start &&
        Date.parse(candidate.endsAt) >= end,
    );
    if (window) {
      dayBudgets.set(
        window.date,
        Math.max(
          0,
          (dayBudgets.get(window.date) ?? 0) - session.plannedMinutes,
        ),
      );
    }
  }

  return windows.reduce((largest, window) => {
    const available = subtract(
      { start: Date.parse(window.startsAt), end: Date.parse(window.endsAt) },
      sessions.map((session) => ({
        start: Date.parse(session.startsAt),
        end: Date.parse(session.endsAt),
      })),
    );
    const continuous = available.reduce(
      (maximum, fragment) =>
        Math.max(
          maximum,
          Math.floor((fragment.end - fragment.start) / MINUTE_MS),
        ),
      0,
    );
    return Math.max(
      largest,
      Math.min(continuous, dayBudgets.get(window.date) ?? 0),
    );
  }, 0);
}

/** Produces a feasible or explicitly diagnosed partial plan without persistence. */
export function diagnosePlan(rawInput: PlannerInput): PlanDraft {
  const input = plannerInputSchema.parse(rawInput);
  const risk = analyzeRisk(input);
  const allocation = allocateSessions(input, risk);

  if (allocation.unallocated.length === 0) {
    return {
      feasibility: "feasible",
      sessions: allocation.sessions,
      activityRisks: risk.activityRisks,
      unallocated: [],
      conflicts: [],
    };
  }

  const unallocatedIds = new Set(
    allocation.unallocated.map(({ activityId }) => activityId),
  );
  const firstUnallocated = [...input.activities]
    .filter(({ id }) => unallocatedIds.has(id))
    .sort(
      (left, right) =>
        Date.parse(left.deadlineAt) - Date.parse(right.deadlineAt) ||
        left.id.localeCompare(right.id),
    )[0]!;
  const unallocatedDeadline = Date.parse(firstUnallocated.deadlineAt);
  const unallocatedDeficit = allocation.unallocated
    .filter(({ activityId }) => {
      const activity = input.activities.find(({ id }) => id === activityId)!;
      return Date.parse(activity.deadlineAt) <= unallocatedDeadline;
    })
    .reduce((total, item) => total + item.minutes, 0);
  const fallbackActivityIds = [...input.activities]
    .filter(({ deadlineAt }) => Date.parse(deadlineAt) <= unallocatedDeadline)
    .sort(
      (left, right) =>
        Date.parse(left.deadlineAt) - Date.parse(right.deadlineAt) ||
        left.id.localeCompare(right.id),
    )
    .map(({ id }) => id);
  const firstAffectedDeadlineAt =
    risk.firstDeficit?.firstAffectedDeadlineAt ??
    new Date(unallocatedDeadline).toISOString();
  const deficitMinutes =
    risk.firstDeficit?.deficitMinutes ?? unallocatedDeficit;
  const activityIds = risk.firstDeficit?.activityIds ?? fallbackActivityIds;

  return {
    feasibility: allocation.sessions.length > 0 ? "partial" : "infeasible",
    sessions: allocation.sessions,
    activityRisks: risk.activityRisks,
    unallocated: allocation.unallocated,
    conflicts: [
      {
        code: "insufficient_capacity",
        firstAffectedDeadlineAt,
        deficitMinutes,
        largestAvailableWindowMinutes: largestRemainingWindow(
          input,
          allocation.sessions,
          firstAffectedDeadlineAt,
        ),
        activityIds,
      },
    ],
  };
}
