import { describe, expect, it } from "vitest";

import {
  PLANNER_CORE_CONTRACT_VERSION,
  PLANNER_CORE_VERSION,
  PLANNER_RULES_VERSION,
  diagnosePlan,
  type PlannerInput,
} from "./index";

const ids = {
  first: "11000000-0000-4000-8000-000000000021",
  second: "11000000-0000-4000-8000-000000000022",
};

function input(overrides: Partial<PlannerInput> = {}): PlannerInput {
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
        id: ids.first,
        deadlineAt: "2026-09-16T02:59:00Z",
        remainingMinutes: 100,
        priority: 2,
        status: "not_started",
        createdAt: "2026-09-14T10:00:00Z",
        dependencyIds: [],
      },
    ],
    protectedSessions: [],
    ...overrides,
  };
}

describe("UT planner-core — plano parcial e diagnóstico", () => {
  it("retorna feasible sem conflito quando todo esforço cabe", () => {
    const result = diagnosePlan(input());

    expect(result.feasibility).toBe("feasible");
    expect(result.sessions).toHaveLength(2);
    expect(result.unallocated).toEqual([]);
    expect(result.conflicts).toEqual([]);
  });

  it("retorna partial e o déficit real quando apenas uma parcela cabe", () => {
    const base = input();
    const result = diagnosePlan(
      input({
        activities: [{ ...base.activities[0]!, remainingMinutes: 170 }],
      }),
    );

    expect(result.feasibility).toBe("partial");
    expect(
      result.sessions.reduce((sum, item) => sum + item.plannedMinutes, 0),
    ).toBe(100);
    expect(result.unallocated).toEqual([
      { activityId: ids.first, minutes: 70 },
    ]);
    expect(result.conflicts[0]).toMatchObject({
      firstAffectedDeadlineAt: "2026-09-16T02:59:00.000Z",
      deficitMinutes: 50,
      largestAvailableWindowMinutes: 20,
      activityIds: [ids.first],
    });
  });

  it("CE-001 / CE-007 — retorna infeasible quando nenhuma sessão cabe", () => {
    const result = diagnosePlan(input({ availability: [] }));

    expect(result.feasibility).toBe("infeasible");
    expect(result.sessions).toEqual([]);
    expect(result.conflicts[0]).toMatchObject({
      deficitMinutes: 100,
      largestAvailableWindowMinutes: 0,
    });
  });

  it("INV-009 — identifica o primeiro prazo e atividades acumuladas", () => {
    const base = input();
    const result = diagnosePlan(
      input({
        activities: [
          { ...base.activities[0]!, remainingMinutes: 100 },
          {
            ...base.activities[0]!,
            id: ids.second,
            deadlineAt: "2026-09-17T02:59:00Z",
            remainingMinutes: 80,
          },
        ],
      }),
    );

    expect(result.conflicts[0]).toMatchObject({
      firstAffectedDeadlineAt: "2026-09-17T02:59:00.000Z",
      deficitMinutes: 60,
      activityIds: [ids.first, ids.second],
    });
  });

  it("detecta déficit de encaixe mesmo quando a capacidade agregada bastaria", () => {
    const base = input();
    const result = diagnosePlan(
      input({
        availability: [
          {
            ...base.availability[0]!,
            startLocal: "18:00:00",
            endLocal: "18:20:00",
          },
          {
            ...base.availability[0]!,
            id: "11000000-0000-4000-8000-000000000012",
            startLocal: "19:00:00",
            endLocal: "19:20:00",
          },
        ],
        activities: [{ ...base.activities[0]!, remainingMinutes: 25 }],
      }),
    );

    expect(result.feasibility).toBe("infeasible");
    expect(result.conflicts[0]).toMatchObject({
      deficitMinutes: 25,
      largestAvailableWindowMinutes: 20,
    });
  });
});
