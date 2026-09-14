import { calculateCapacity } from "./capacity";
import { plannerInputSchema, type PlannerInput } from "./planner-contracts";

const HOUR_MS = 3_600_000;

export type RiskLevel =
  "controlled" | "attention" | "critical" | "infeasible" | "overdue";

export type LoadRate = number | "infinite";

export type DeadlineHorizon = {
  deadlineAt: string;
  demandMinutes: number;
  capacityMinutes: number;
  loadRate: LoadRate;
  slackMinutes: number;
  deficitMinutes: number;
};

export type ActivityRisk = {
  activityId: string;
  level: RiskLevel;
  slackMinutes: number;
  loadRate: LoadRate;
};

export type CapacityDeficit = {
  firstAffectedDeadlineAt: string;
  deficitMinutes: number;
  activityIds: string[];
};

export type RiskAnalysis = {
  horizons: DeadlineHorizon[];
  activityRisks: ActivityRisk[];
  firstDeficit: CapacityDeficit | null;
};

function loadRate(demandMinutes: number, capacityMinutes: number): LoadRate {
  if (capacityMinutes === 0) {
    return demandMinutes === 0 ? 0 : "infinite";
  }
  return demandMinutes / capacityMinutes;
}

function riskLevel(
  deadline: number,
  generatedAt: number,
  horizon: DeadlineHorizon,
  preferredSessionMinutes: number,
): RiskLevel {
  if (deadline < generatedAt) return "overdue";
  if (horizon.loadRate === "infinite" || horizon.loadRate > 1) {
    return "infeasible";
  }
  if (
    horizon.loadRate >= 0.8 ||
    horizon.slackMinutes < preferredSessionMinutes
  ) {
    return "critical";
  }
  if (horizon.loadRate >= 0.5 || deadline - generatedAt <= 72 * HOUR_MS) {
    return "attention";
  }
  return "controlled";
}

/** Evaluates cumulative demand and capacity at every distinct activity deadline. */
export function analyzeRisk(rawInput: PlannerInput): RiskAnalysis {
  const input = plannerInputSchema.parse(rawInput);
  const activities = [...input.activities].sort(
    (left, right) =>
      Date.parse(left.deadlineAt) - Date.parse(right.deadlineAt) ||
      left.id.localeCompare(right.id),
  );
  const deadlines = [
    ...new Set(activities.map(({ deadlineAt }) => Date.parse(deadlineAt))),
  ];
  const horizons = deadlines.map((deadline) => {
    const deadlineAt = new Date(deadline).toISOString();
    const demandMinutes = activities
      .filter((activity) => Date.parse(activity.deadlineAt) <= deadline)
      .reduce((total, activity) => total + activity.remainingMinutes, 0);
    const capacityMinutes = calculateCapacity(input, {
      availableUntil: deadlineAt,
    }).totals.netMinutes;
    const slackMinutes = capacityMinutes - demandMinutes;

    return {
      deadlineAt,
      demandMinutes,
      capacityMinutes,
      loadRate: loadRate(demandMinutes, capacityMinutes),
      slackMinutes,
      deficitMinutes: Math.max(0, -slackMinutes),
    };
  });
  const horizonByDeadline = new Map(
    horizons.map((horizon) => [Date.parse(horizon.deadlineAt), horizon]),
  );
  const generatedAt = Date.parse(input.generatedAt);
  const activityRisks = activities.map((activity) => {
    const horizon = horizonByDeadline.get(Date.parse(activity.deadlineAt))!;

    return {
      activityId: activity.id,
      level: riskLevel(
        Date.parse(activity.deadlineAt),
        generatedAt,
        horizon,
        input.preferences.preferredSessionMinutes,
      ),
      slackMinutes: horizon.slackMinutes,
      loadRate: horizon.loadRate,
    };
  });
  const firstAffected = horizons.find(
    ({ deficitMinutes }) => deficitMinutes > 0,
  );

  return {
    horizons,
    activityRisks,
    firstDeficit: firstAffected
      ? {
          firstAffectedDeadlineAt: firstAffected.deadlineAt,
          deficitMinutes: firstAffected.deficitMinutes,
          activityIds: activities
            .filter(
              (activity) =>
                Date.parse(activity.deadlineAt) <=
                Date.parse(firstAffected.deadlineAt),
            )
            .map(({ id }) => id),
        }
      : null,
  };
}
