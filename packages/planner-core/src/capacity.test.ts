import { describe, expect, it } from "vitest";

import {
  PLANNER_CORE_CONTRACT_VERSION,
  PLANNER_CORE_VERSION,
  PLANNER_RULES_VERSION,
  calculateCapacity,
  type PlannerInput,
} from "./index";

const activityId = "11000000-0000-4000-8000-000000000021";

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
        id: activityId,
        deadlineAt: "2026-09-20T02:59:00Z",
        remainingMinutes: 50,
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

describe("UT planner-core — capacidade", () => {
  it("calcula o exemplo canônico de 300 minutos com reserva de 20%", () => {
    const result = calculateCapacity(input());

    expect(result.days[0]).toEqual({
      date: "2026-09-14",
      grossMinutes: 300,
      operationalMinutes: 300,
      reservedMinutes: 60,
      netMinutes: 240,
    });
    expect(result.totals.netMinutes).toBe(240);
  });

  it("subtrai bloqueios e sessões protegidas sem contar sobreposição duas vezes", () => {
    const result = calculateCapacity(
      input({
        blocks: [
          {
            id: "11000000-0000-4000-8000-000000000031",
            startsAt: "2026-09-14T22:00:00Z",
            endsAt: "2026-09-14T23:00:00Z",
            kind: "recurring_commitment",
          },
        ],
        protectedSessions: [
          {
            id: "11000000-0000-4000-8000-000000000041",
            activityId,
            startsAt: "2026-09-14T22:30:00Z",
            endsAt: "2026-09-14T23:30:00Z",
            actualMinutes: 0,
            protection: "pinned",
          },
        ],
      }),
    );

    expect(result.days[0]).toMatchObject({
      grossMinutes: 300,
      operationalMinutes: 210,
      reservedMinutes: 42,
      netMinutes: 168,
    });
  });

  it("consolida disponibilidades sobrepostas e ignora ocupação fora delas", () => {
    const base = input();
    const result = calculateCapacity(
      input({
        availability: [
          ...base.availability,
          {
            id: "11000000-0000-4000-8000-000000000012",
            dayOfWeek: 1,
            startLocal: "19:00:00",
            endLocal: "21:00:00",
          },
        ],
        blocks: [
          {
            id: "11000000-0000-4000-8000-000000000032",
            startsAt: "2026-09-14T12:00:00Z",
            endsAt: "2026-09-14T13:00:00Z",
            kind: "calendar_block",
          },
        ],
      }),
    );

    expect(result.days[0]?.grossMinutes).toBe(300);
    expect(result.days[0]?.operationalMinutes).toBe(300);
  });

  it("agrega por semana civil iniciada na segunda-feira", () => {
    const base = input();
    const result = calculateCapacity(
      input({
        horizonEndDate: "2026-09-21",
        availability: [
          ...base.availability,
          {
            id: "11000000-0000-4000-8000-000000000013",
            dayOfWeek: 0,
            startLocal: "18:00:00",
            endLocal: "19:00:00",
          },
        ],
      }),
    );

    expect(result.weeks).toEqual([
      {
        weekStartDate: "2026-09-14",
        grossMinutes: 360,
        operationalMinutes: 360,
        reservedMinutes: 72,
        netMinutes: 288,
      },
      {
        weekStartDate: "2026-09-21",
        grossMinutes: 300,
        operationalMinutes: 300,
        reservedMinutes: 60,
        netMinutes: 240,
      },
    ]);
  });

  it("mantém bruto >= operacional >= líquido para uma grade de casos", () => {
    for (let reservePercent = 0; reservePercent <= 80; reservePercent += 5) {
      for (
        let blockedMinutes = 0;
        blockedMinutes <= 300;
        blockedMinutes += 15
      ) {
        const result = calculateCapacity(
          input({
            preferences: { ...input().preferences, reservePercent },
            blocks:
              blockedMinutes === 0
                ? []
                : [
                    {
                      id: "11000000-0000-4000-8000-000000000033",
                      startsAt: "2026-09-14T21:00:00Z",
                      endsAt: new Date(
                        Date.parse("2026-09-14T21:00:00Z") +
                          blockedMinutes * 60_000,
                      ).toISOString(),
                      kind: "calendar_block",
                    },
                  ],
          }),
        );
        const day = result.days[0]!;

        expect(day.grossMinutes).toBeGreaterThanOrEqual(day.operationalMinutes);
        expect(day.operationalMinutes).toBeGreaterThanOrEqual(day.netMinutes);
        expect(day.reservedMinutes + day.netMinutes).toBe(
          day.operationalMinutes,
        );
      }
    }
  });
});
