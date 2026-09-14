import { describe, expect, it } from "vitest";

import {
  PLANNER_CORE_CONTRACT_VERSION,
  PLANNER_CORE_VERSION,
  PLANNER_RULES_VERSION,
  plannerInputSchema,
  plannerOutputSchema,
} from "./index";

const activityId = "11000000-0000-4000-8000-000000000021";

function validInput() {
  return {
    contractVersion: PLANNER_CORE_CONTRACT_VERSION,
    plannerVersion: PLANNER_CORE_VERSION,
    rulesVersion: PLANNER_RULES_VERSION,
    generatedAt: "2026-09-14T12:00:00Z",
    timezone: "America/Sao_Paulo",
    horizonStartDate: "2026-09-14",
    horizonEndDate: "2026-09-30",
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
        endLocal: "20:00:00",
      },
    ],
    blocks: [],
    activities: [
      {
        id: activityId,
        deadlineAt: "2026-09-19T02:59:00Z",
        remainingMinutes: 50,
        priority: 2,
        status: "not_started",
        createdAt: "2026-09-14T10:00:00Z",
        dependencyIds: [],
      },
    ],
    protectedSessions: [],
  };
}

function validOutput() {
  return {
    contractVersion: PLANNER_CORE_CONTRACT_VERSION,
    plannerVersion: PLANNER_CORE_VERSION,
    rulesVersion: PLANNER_RULES_VERSION,
    feasibility: "feasible" as const,
    requiresConfirmation: true as const,
    capacity: {
      grossMinutes: 120,
      operationalMinutes: 120,
      netMinutes: 96,
      allocatedMinutes: 50,
    },
    sessions: [
      {
        sessionId: "11000000-0000-4000-8000-000000000041",
        activityId,
        startsAt: "2026-09-14T21:00:00Z",
        endsAt: "2026-09-14T21:50:00Z",
        plannedMinutes: 50,
        changeKind: "created" as const,
        rationaleCode: "earliest_deadline" as const,
      },
    ],
    activityRisks: [
      {
        activityId,
        level: "controlled" as const,
        slackMinutes: 46,
        loadRate: 0.52,
      },
    ],
    unallocated: [],
    conflicts: [],
    changes: { created: 1, kept: 0, moved: 0, removed: 0 },
    inputHash: "a".repeat(64),
    outputHash: "b".repeat(64),
  };
}

describe("CT planner-core — contratos versionados", () => {
  it("aceita entrada e saída normalizadas da versão vigente", () => {
    expect(plannerInputSchema.parse(validInput())).toEqual(validInput());
    expect(plannerOutputSchema.parse(validOutput())).toEqual(validOutput());
  });

  it("rejeita versão desconhecida, fuso inválido e campos extras", () => {
    expect(
      plannerInputSchema.safeParse({ ...validInput(), contractVersion: 2 })
        .success,
    ).toBe(false);
    expect(
      plannerInputSchema.safeParse({ ...validInput(), timezone: "Sao Paulo" })
        .success,
    ).toBe(false);
    expect(
      plannerInputSchema.safeParse({
        ...validInput(),
        segredo: "não permitido",
      }).success,
    ).toBe(false);
  });

  it("limita o horizonte e exige referências internas válidas", () => {
    expect(
      plannerInputSchema.safeParse({
        ...validInput(),
        horizonEndDate: "2026-12-31",
      }).success,
    ).toBe(false);
    expect(
      plannerInputSchema.safeParse({
        ...validInput(),
        protectedSessions: [
          {
            id: "11000000-0000-4000-8000-000000000042",
            activityId: "11000000-0000-4000-8000-000000000099",
            startsAt: "2026-09-14T21:00:00Z",
            endsAt: "2026-09-14T21:50:00Z",
            actualMinutes: 0,
            protection: "pinned",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejeita uma saída viável que esconda conflito ou exceda capacidade", () => {
    const conflict = {
      code: "insufficient_capacity" as const,
      firstAffectedDeadlineAt: "2026-09-19T02:59:00Z",
      deficitMinutes: 25,
      largestAvailableWindowMinutes: 20,
      activityIds: [activityId],
    };
    expect(
      plannerOutputSchema.safeParse({ ...validOutput(), conflicts: [conflict] })
        .success,
    ).toBe(false);
    expect(
      plannerOutputSchema.safeParse({
        ...validOutput(),
        capacity: { ...validOutput().capacity, netMinutes: 121 },
      }).success,
    ).toBe(false);
  });

  it("aceita plano parcial somente com diagnóstico e esforço não alocado", () => {
    const output = {
      ...validOutput(),
      feasibility: "partial" as const,
      unallocated: [{ activityId, minutes: 25 }],
      conflicts: [
        {
          code: "insufficient_capacity" as const,
          firstAffectedDeadlineAt: "2026-09-19T02:59:00Z",
          deficitMinutes: 25,
          largestAvailableWindowMinutes: 20,
          activityIds: [activityId],
        },
      ],
    };

    expect(plannerOutputSchema.parse(output)).toEqual(output);
  });
});
