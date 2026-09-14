import { describe, expect, it } from "vitest";

import {
  PLANNER_CORE_CONTRACT_VERSION,
  PLANNER_CORE_VERSION,
  PLANNER_RULES_VERSION,
  analyzeRisk,
  plannerOutputSchema,
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
      reservePercent: 20,
      dailyLimitMinutes: 240,
    },
    availability: [
      {
        id: "11000000-0000-4000-8000-000000000011",
        dayOfWeek: 1,
        startLocal: "18:00:00",
        endLocal: "23:00:00",
      },
    ],
    blocks: [],
    activities: [
      {
        id: ids.first,
        deadlineAt: "2026-09-15T02:00:00.000Z",
        remainingMinutes: 120,
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

describe("UT planner-core — horizontes e risco", () => {
  it("recorta capacidade no horário exato do prazo", () => {
    const result = analyzeRisk(input());

    expect(result.horizons).toEqual([
      {
        deadlineAt: "2026-09-15T02:00:00.000Z",
        demandMinutes: 120,
        capacityMinutes: 240,
        loadRate: 0.5,
        slackMinutes: 120,
        deficitMinutes: 0,
      },
    ]);
    expect(result.activityRisks[0]?.level).toBe("attention");
  });

  it("CE-016 — capacidade igual à demanda é crítica, sem déficit", () => {
    const result = analyzeRisk(
      input({
        activities: [{ ...input().activities[0]!, remainingMinutes: 240 }],
      }),
    );

    expect(result.horizons[0]).toMatchObject({
      loadRate: 1,
      slackMinutes: 0,
      deficitMinutes: 0,
    });
    expect(result.activityRisks[0]?.level).toBe("critical");
    expect(result.firstDeficit).toBeNull();
  });

  it("INV-009 — identifica o primeiro prazo e o déficit acumulado exatos", () => {
    const base = input();
    const result = analyzeRisk(
      input({
        activities: [
          { ...base.activities[0]!, remainingMinutes: 200 },
          {
            ...base.activities[0]!,
            id: ids.second,
            deadlineAt: "2026-09-16T02:59:00Z",
            remainingMinutes: 100,
          },
        ],
      }),
    );

    expect(result.horizons.map(({ demandMinutes }) => demandMinutes)).toEqual([
      200, 300,
    ]);
    expect(result.firstDeficit).toEqual({
      firstAffectedDeadlineAt: "2026-09-16T02:59:00.000Z",
      deficitMinutes: 60,
      activityIds: [ids.first, ids.second],
    });
    expect(result.activityRisks[1]?.level).toBe("infeasible");
  });

  it("normaliza offsets equivalentes em um único horizonte", () => {
    const base = input();
    const result = analyzeRisk(
      input({
        activities: [
          base.activities[0]!,
          {
            ...base.activities[0]!,
            id: ids.second,
            deadlineAt: "2026-09-14T23:00:00-03:00",
          },
        ],
      }),
    );

    expect(result.horizons).toHaveLength(1);
    expect(result.horizons[0]?.deadlineAt).toBe("2026-09-15T02:00:00.000Z");
    expect(result.horizons[0]?.demandMinutes).toBe(240);
  });

  it("trata demanda sem capacidade como infinita e serializável na saída", () => {
    const result = analyzeRisk(input({ availability: [] }));
    const risk = result.activityRisks[0]!;

    expect(risk.loadRate).toBe("infinite");
    expect(risk.level).toBe("infeasible");
    expect(JSON.parse(JSON.stringify(risk))).toEqual(risk);
    expect(
      plannerOutputSchema.safeParse({
        contractVersion: PLANNER_CORE_CONTRACT_VERSION,
        plannerVersion: PLANNER_CORE_VERSION,
        rulesVersion: PLANNER_RULES_VERSION,
        feasibility: "infeasible",
        requiresConfirmation: true,
        capacity: {
          grossMinutes: 0,
          operationalMinutes: 0,
          netMinutes: 0,
          allocatedMinutes: 0,
        },
        sessions: [],
        activityRisks: [risk],
        unallocated: [{ activityId: ids.first, minutes: 120 }],
        conflicts: [
          {
            code: "insufficient_capacity",
            firstAffectedDeadlineAt:
              result.firstDeficit!.firstAffectedDeadlineAt,
            deficitMinutes: 120,
            largestAvailableWindowMinutes: 0,
            activityIds: [ids.first],
          },
        ],
        changes: { created: 0, kept: 0, moved: 0, removed: 0 },
        inputHash: "a".repeat(64),
        outputHash: "b".repeat(64),
      }).success,
    ).toBe(true);
  });

  it("CE-003 — prazo anterior ao relógio tem risco vencido", () => {
    const base = input();
    const result = analyzeRisk(
      input({
        activities: [
          {
            ...base.activities[0]!,
            deadlineAt: "2026-09-13T21:00:00Z",
            remainingMinutes: 50,
          },
        ],
      }),
    );

    expect(result.activityRisks[0]).toMatchObject({
      level: "overdue",
      loadRate: "infinite",
      slackMinutes: -50,
    });
  });

  it.each([
    { demand: 50, expected: "controlled" },
    { demand: 120, expected: "attention" },
    { demand: 191, expected: "critical" },
    { demand: 192, expected: "critical" },
    { demand: 241, expected: "infeasible" },
  ] as const)(
    "classifica a fronteira de $demand minutos como $expected",
    ({ demand, expected }) => {
      const base = input();
      const result = analyzeRisk(
        input({
          generatedAt: "2026-09-10T12:00:00Z",
          activities: [{ ...base.activities[0]!, remainingMinutes: demand }],
        }),
      );

      expect(result.activityRisks[0]?.level).toBe(expected);
    },
  );
});
