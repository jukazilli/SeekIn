import { describe, expect, it } from "vitest";

import {
  PLANNER_CORE_CONTRACT_VERSION,
  PLANNER_CORE_VERSION,
  PLANNER_RULES_VERSION,
  proposeReplanning,
  type PlannerInput,
} from "./index";

const activityId = "11000000-0000-4000-8000-000000000021";

function input(
  protectedSessions: PlannerInput["protectedSessions"],
): PlannerInput {
  return {
    contractVersion: PLANNER_CORE_CONTRACT_VERSION,
    plannerVersion: PLANNER_CORE_VERSION,
    rulesVersion: PLANNER_RULES_VERSION,
    generatedAt: "2026-09-14T12:00:00Z",
    timezone: "America/Sao_Paulo",
    horizonStartDate: "2026-09-14",
    horizonEndDate: "2026-09-20",
    preferences: {
      preferredSessionMinutes: 50,
      minimumSessionMinutes: 25,
      reservePercent: 0,
      dailyLimitMinutes: 240,
    },
    availability: [
      {
        id: "11000000-0000-4000-8000-000000000011",
        dayOfWeek: 1,
        startLocal: "18:00:00",
        endLocal: "20:00:00",
      },
    ],
    blocks: [],
    activities: [
      {
        id: activityId,
        deadlineAt: "2026-09-16T02:59:00Z",
        remainingMinutes: 100,
        priority: 2,
        status: "not_started",
        createdAt: "2026-09-14T10:00:00Z",
        dependencyIds: [],
      },
    ],
    protectedSessions,
  };
}

function protectedSession(
  protection: "completed" | "in_progress" | "pinned" | "manual",
  index: number,
  overrides: Partial<PlannerInput["protectedSessions"][number]> = {},
): PlannerInput["protectedSessions"][number] {
  return {
    id: `11000000-0000-4000-8000-00000000004${index}`,
    activityId,
    startsAt: "2026-09-14T21:00:00Z",
    endsAt: "2026-09-14T21:50:00Z",
    actualMinutes: 0,
    protection,
    ...overrides,
  };
}

describe("UT planner-core — proposta de replanejamento", () => {
  it.each(["completed", "in_progress", "pinned", "manual"] as const)(
    "preserva identidade e horário da sessão %s",
    (protection) => {
      const existing = protectedSession(protection, 1);
      const result = proposeReplanning(input([existing]));

      expect(result.keptSessions).toEqual([existing]);
      expect(result.keptSessions[0]).not.toBe(existing);
      expect(
        result.sessions.every(({ startsAt }) => startsAt !== existing.startsAt),
      ).toBe(true);
    },
  );

  it("INV-004 — sessão concluída histórica não reduz esforço outra vez", () => {
    const completed = protectedSession("completed", 1, {
      startsAt: "2026-09-14T10:00:00Z",
      endsAt: "2026-09-14T10:50:00Z",
      actualMinutes: 50,
    });
    const result = proposeReplanning(input([completed]));

    expect(result.keptSessions).toEqual([completed]);
    expect(
      result.sessions.reduce((sum, item) => sum + item.plannedMinutes, 0),
    ).toBe(100);
  });

  it("desconta sessão futura protegida do esforço automático", () => {
    const pinned = protectedSession("pinned", 1);
    const result = proposeReplanning(input([pinned]));

    expect(result.feasibility).toBe("feasible");
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]).toMatchObject({
      plannedMinutes: 50,
      startsAt: "2026-09-14T21:50:00.000Z",
    });
  });

  it("considera somente a parcela não realizada da sessão em andamento", () => {
    const inProgress = protectedSession("in_progress", 1, {
      actualMinutes: 20,
    });
    const result = proposeReplanning(input([inProgress]));

    expect(
      result.sessions.reduce((sum, item) => sum + item.plannedMinutes, 0),
    ).toBe(70);
  });

  it("ordena proteções pela precedência canônica", () => {
    const manual = protectedSession("manual", 4);
    const pinned = protectedSession("pinned", 3);
    const inProgress = protectedSession("in_progress", 2);
    const completed = protectedSession("completed", 1);

    expect(
      proposeReplanning(
        input([manual, pinned, inProgress, completed]),
      ).keptSessions.map(({ protection }) => protection),
    ).toEqual(["completed", "in_progress", "pinned", "manual"]);
  });

  it("INV-005 / CE-012 — mantém todas as fixadas e explicita conflito de proteção", () => {
    const sessions = [
      protectedSession("pinned", 1),
      protectedSession("pinned", 2, {
        startsAt: "2026-09-14T21:50:00Z",
        endsAt: "2026-09-14T22:40:00Z",
      }),
    ];
    const base = input(sessions);
    base.activities[0] = { ...base.activities[0]!, remainingMinutes: 150 };
    const result = proposeReplanning(base);

    expect(result.keptSessions).toEqual(sessions);
    expect(result.sessions).toEqual([]);
    expect(result.feasibility).toBe("infeasible");
    expect(result.conflicts[0]).toMatchObject({
      code: "protected_capacity",
      deficitMinutes: 30,
    });
  });
});
