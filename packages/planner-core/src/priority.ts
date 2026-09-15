import { plannerInputSchema, type PlannerInput } from "./planner-contracts.ts";
import {
  analyzeRisk,
  type RiskAnalysis,
  type RiskLevel,
} from "./risk-analysis.ts";

export type PriorityFactorCode =
  | "overdue"
  | "infeasible_horizon"
  | "earliest_deadline"
  | "lowest_slack"
  | "manual_priority"
  | "largest_remaining_effort"
  | "already_started"
  | "oldest_activity"
  | "stable_id";

export type PriorityFactors = {
  overdue: boolean;
  infeasibleHorizon: boolean;
  deadlineAt: string;
  slackMinutes: number;
  manualPriority: number;
  remainingMinutes: number;
  alreadyStarted: boolean;
  createdAt: string;
};

export type RankedActivity = {
  rank: number;
  activityId: string;
  riskLevel: RiskLevel;
  decidingFactor: PriorityFactorCode;
  factors: PriorityFactors;
};

type Candidate = Omit<RankedActivity, "rank" | "decidingFactor">;

const factorOrder: Array<{
  code: PriorityFactorCode;
  compare: (left: Candidate, right: Candidate) => number;
}> = [
  {
    code: "overdue",
    compare: (left, right) =>
      Number(right.factors.overdue) - Number(left.factors.overdue),
  },
  {
    code: "infeasible_horizon",
    compare: (left, right) =>
      Number(right.factors.infeasibleHorizon) -
      Number(left.factors.infeasibleHorizon),
  },
  {
    code: "earliest_deadline",
    compare: (left, right) =>
      Date.parse(left.factors.deadlineAt) -
      Date.parse(right.factors.deadlineAt),
  },
  {
    code: "lowest_slack",
    compare: (left, right) =>
      left.factors.slackMinutes - right.factors.slackMinutes,
  },
  {
    code: "manual_priority",
    compare: (left, right) =>
      right.factors.manualPriority - left.factors.manualPriority,
  },
  {
    code: "largest_remaining_effort",
    compare: (left, right) =>
      right.factors.remainingMinutes - left.factors.remainingMinutes,
  },
  {
    code: "already_started",
    compare: (left, right) =>
      Number(right.factors.alreadyStarted) -
      Number(left.factors.alreadyStarted),
  },
  {
    code: "oldest_activity",
    compare: (left, right) =>
      Date.parse(left.factors.createdAt) - Date.parse(right.factors.createdAt),
  },
  {
    code: "stable_id",
    compare: (left, right) => left.activityId.localeCompare(right.activityId),
  },
];

function compareCandidates(left: Candidate, right: Candidate): number {
  for (const factor of factorOrder) {
    const result = factor.compare(left, right);
    if (result !== 0) return result;
  }
  return 0;
}

function decidingFactor(
  candidate: Candidate,
  nextCandidate: Candidate | undefined,
): PriorityFactorCode {
  if (!nextCandidate) {
    if (candidate.factors.overdue) return "overdue";
    if (candidate.factors.infeasibleHorizon) return "infeasible_horizon";
    return "earliest_deadline";
  }
  return (
    factorOrder.find(({ compare }) => compare(candidate, nextCandidate) !== 0)
      ?.code ?? "stable_id"
  );
}

/** Applies the documented v1 lexicographic priority order without hidden weights. */
export function rankActivities(
  rawInput: PlannerInput,
  riskAnalysis?: RiskAnalysis,
): RankedActivity[] {
  const input = plannerInputSchema.parse(rawInput);
  const risks = new Map(
    (riskAnalysis ?? analyzeRisk(input)).activityRisks.map((risk) => [
      risk.activityId,
      risk,
    ]),
  );
  const candidates: Candidate[] = input.activities.map((activity) => {
    const risk = risks.get(activity.id)!;

    return {
      activityId: activity.id,
      riskLevel: risk.level,
      factors: {
        overdue: risk.level === "overdue",
        infeasibleHorizon: risk.level === "infeasible",
        deadlineAt: new Date(activity.deadlineAt).toISOString(),
        slackMinutes: risk.slackMinutes,
        manualPriority: activity.priority,
        remainingMinutes: activity.remainingMinutes,
        alreadyStarted: activity.status === "in_progress",
        createdAt: new Date(activity.createdAt).toISOString(),
      },
    };
  });
  candidates.sort(compareCandidates);

  return candidates.map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
    decidingFactor: decidingFactor(candidate, candidates[index + 1]),
  }));
}
