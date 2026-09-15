import { plannerInputSchema, type PlannerInput } from "./planner-contracts";
import { diagnosePlan, type PlanDraft } from "./plan-diagnostic";

const MINUTE_MS = 60_000;
const PROTECTION_ORDER = {
  completed: 0,
  in_progress: 1,
  pinned: 2,
  manual: 3,
} as const;

export type ReplanningProposal = PlanDraft & {
  keptSessions: PlannerInput["protectedSessions"];
};

function reservedEffort(
  session: PlannerInput["protectedSessions"][number],
  generatedAt: number,
): number {
  if (
    session.protection === "completed" ||
    Date.parse(session.endsAt) <= generatedAt
  ) {
    return 0;
  }
  const planned = Math.floor(
    (Date.parse(session.endsAt) - Date.parse(session.startsAt)) / MINUTE_MS,
  );
  return session.protection === "in_progress"
    ? Math.max(0, planned - session.actualMinutes)
    : planned;
}

function planningInput(
  input: PlannerInput,
  keepProtection: boolean,
): PlannerInput {
  const generatedAt = Date.parse(input.generatedAt);
  const reservedByActivity = new Map<string, number>();
  for (const session of input.protectedSessions) {
    reservedByActivity.set(
      session.activityId,
      (reservedByActivity.get(session.activityId) ?? 0) +
        reservedEffort(session, generatedAt),
    );
  }
  const activities = input.activities
    .map((activity) => ({
      ...activity,
      remainingMinutes:
        activity.remainingMinutes - (reservedByActivity.get(activity.id) ?? 0),
    }))
    .filter(({ remainingMinutes }) => remainingMinutes > 0);

  return {
    ...input,
    activities,
    blocks: keepProtection
      ? [
          ...input.blocks,
          ...input.protectedSessions.map((session) => ({
            id: session.id,
            startsAt: session.startsAt,
            endsAt: session.endsAt,
            kind: "calendar_block" as const,
          })),
        ]
      : input.blocks,
    protectedSessions: [],
  };
}

/** Preserves protected work and replans only the remaining automatic effort. */
export function proposeReplanning(rawInput: PlannerInput): ReplanningProposal {
  const input = plannerInputSchema.parse(rawInput);
  const draft = diagnosePlan(planningInput(input, true));

  if (draft.conflicts.length > 0 && input.protectedSessions.length > 0) {
    const withoutProtection = diagnosePlan(planningInput(input, false));
    const protectedCause =
      withoutProtection.conflicts.length === 0 ||
      withoutProtection.conflicts[0]!.deficitMinutes <
        draft.conflicts[0]!.deficitMinutes;
    if (protectedCause) {
      draft.conflicts = draft.conflicts.map((conflict) => ({
        ...conflict,
        code: "protected_capacity",
      }));
    }
  }

  return {
    ...draft,
    keptSessions: input.protectedSessions
      .map((session) => ({ ...session }))
      .sort(
        (left, right) =>
          PROTECTION_ORDER[left.protection] -
            PROTECTION_ORDER[right.protection] ||
          Date.parse(left.startsAt) - Date.parse(right.startsAt) ||
          left.id.localeCompare(right.id),
      ),
  };
}
