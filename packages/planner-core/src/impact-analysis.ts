import type { PlannerInput } from "./planner-contracts.ts";
import type { PlanDraft } from "./plan-diagnostic.ts";

export type CurrentPlanSession = {
  sessionId: string;
  activityId: string;
  startsAt: string;
  endsAt: string;
  plannedMinutes: number;
};

type SchedulableSession = Pick<
  PlanDraft["sessions"][number],
  "activityId" | "startsAt" | "endsAt" | "plannedMinutes" | "rationaleCode"
>;

export type ImpactSession = SchedulableSession & {
  sessionId: string | null;
  changeKind: "created" | "kept" | "moved";
};

function compareSession(
  left: Pick<CurrentPlanSession, "activityId" | "startsAt" | "sessionId">,
  right: Pick<CurrentPlanSession, "activityId" | "startsAt" | "sessionId">,
): number {
  return (
    left.activityId.localeCompare(right.activityId) ||
    Date.parse(left.startsAt) - Date.parse(right.startsAt) ||
    left.sessionId.localeCompare(right.sessionId)
  );
}

/** Reuses identities from the current plan so the impact diff is stable and actionable. */
export function reconcileImpactSessions(
  proposed: SchedulableSession[],
  protectedSessions: PlannerInput["protectedSessions"],
  current: CurrentPlanSession[],
): { sessions: ImpactSession[]; removedSessionIds: string[] } {
  const protectedIds = new Set(protectedSessions.map(({ id }) => id));
  const movable = current
    .filter(({ sessionId }) => !protectedIds.has(sessionId))
    .sort(compareSession);
  const candidates = [...proposed].sort(
    (left, right) =>
      left.activityId.localeCompare(right.activityId) ||
      Date.parse(left.startsAt) - Date.parse(right.startsAt),
  );
  const used = new Set<string>();
  const sessions: ImpactSession[] = protectedSessions.map((session) => ({
    sessionId: session.id,
    activityId: session.activityId,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    plannedMinutes: Math.floor(
      (Date.parse(session.endsAt) - Date.parse(session.startsAt)) / 60_000,
    ),
    rationaleCode:
      session.protection === "completed" || session.protection === "in_progress"
        ? "already_started"
        : "manual_priority",
    changeKind: "kept",
  }));

  for (const candidate of candidates) {
    const previous = movable.find(
      (session) =>
        !used.has(session.sessionId) &&
        session.activityId === candidate.activityId,
    );
    if (!previous) {
      sessions.push({ ...candidate, sessionId: null, changeKind: "created" });
      continue;
    }
    used.add(previous.sessionId);
    const kept =
      previous.startsAt === candidate.startsAt &&
      previous.endsAt === candidate.endsAt &&
      previous.plannedMinutes === candidate.plannedMinutes;
    sessions.push({
      ...candidate,
      sessionId: previous.sessionId,
      changeKind: kept ? "kept" : "moved",
    });
  }

  return {
    sessions,
    removedSessionIds: movable
      .filter(({ sessionId }) => !used.has(sessionId))
      .map(({ sessionId }) => sessionId),
  };
}
