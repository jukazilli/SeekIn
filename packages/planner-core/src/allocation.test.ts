import { describe, expect, it } from "vitest";
import fc from "fast-check";

import {
  PLANNER_CORE_CONTRACT_VERSION,
  PLANNER_CORE_VERSION,
  PLANNER_RULES_VERSION,
  allocateSessions,
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
      reservePercent: 0,
      dailyLimitMinutes: 240,
    },
    availability: [1, 2, 3].map((dayOfWeek, index) => ({
      id: `11000000-0000-4000-8000-00000000001${index + 1}`,
      dayOfWeek,
      startLocal: "18:00:00",
      endLocal: "20:00:00",
    })),
    blocks: [],
    activities: [
      {
        id: activityId,
        deadlineAt: "2026-09-18T02:59:00Z",
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

describe("UT planner-core — alocação", () => {
  it("distribui sessões entre dias e mantém a folga de 24 horas", () => {
    const result = allocateSessions(input());

    expect(result.unallocated).toEqual([]);
    expect(result.sessions.map(({ startsAt }) => startsAt)).toEqual([
      "2026-09-14T21:00:00.000Z",
      "2026-09-15T21:00:00.000Z",
    ]);
    expect(
      result.sessions.every(({ usesDeadlineBuffer }) => usesDeadlineBuffer),
    ).toBe(true);
  });

  it("INV-002 — não sobrepõe bloqueio nem sessão protegida", () => {
    const result = allocateSessions(
      input({
        blocks: [
          {
            id: "11000000-0000-4000-8000-000000000031",
            startsAt: "2026-09-14T21:00:00Z",
            endsAt: "2026-09-14T22:00:00Z",
            kind: "calendar_block",
          },
        ],
        protectedSessions: [
          {
            id: "11000000-0000-4000-8000-000000000041",
            activityId,
            startsAt: "2026-09-15T21:00:00Z",
            endsAt: "2026-09-15T22:00:00Z",
            actualMinutes: 0,
            protection: "pinned",
          },
        ],
      }),
    );

    expect(result.sessions.map(({ startsAt }) => startsAt)).toEqual([
      "2026-09-14T22:00:00.000Z",
      "2026-09-15T22:00:00.000Z",
    ]);
  });

  it("respeita limite diário e usa a faixa final somente quando necessário", () => {
    const base = input();
    const result = allocateSessions(
      input({
        preferences: { ...base.preferences, dailyLimitMinutes: 50 },
        activities: [
          {
            ...base.activities[0]!,
            deadlineAt: "2026-09-16T21:30:00Z",
          },
        ],
      }),
    );

    expect(result.sessions).toHaveLength(3);
    expect(result.sessions[0]).toMatchObject({ usesDeadlineBuffer: true });
    expect(result.sessions[1]).toMatchObject({
      startsAt: "2026-09-15T21:00:00.000Z",
      plannedMinutes: 25,
      usesDeadlineBuffer: true,
    });
    expect(result.sessions[2]).toMatchObject({
      startsAt: "2026-09-16T21:00:00.000Z",
      plannedMinutes: 25,
      usesDeadlineBuffer: false,
    });
  });

  it("reparte um bloco para caber em janelas contínuas menores", () => {
    const base = input();
    const result = allocateSessions(
      input({
        availability: [1, 2].map((dayOfWeek, index) => ({
          id: `11000000-0000-4000-8000-00000000001${index + 1}`,
          dayOfWeek,
          startLocal: "18:00:00",
          endLocal: "18:30:00",
        })),
        activities: [{ ...base.activities[0]!, remainingMinutes: 50 }],
      }),
    );

    expect(result.sessions.map(({ plannedMinutes }) => plannedMinutes)).toEqual(
      [25, 25],
    );
    expect(result.unallocated).toEqual([]);
  });

  it("INV-003 / INV-006 e CE-016 — carga exata não excede capacidade", () => {
    const base = input();
    const result = allocateSessions(
      input({
        preferences: { ...base.preferences, reservePercent: 20 },
        availability: [
          {
            id: "11000000-0000-4000-8000-000000000011",
            dayOfWeek: 1,
            startLocal: "18:00:00",
            endLocal: "23:00:00",
          },
        ],
        activities: [{ ...base.activities[0]!, remainingMinutes: 240 }],
      }),
    );

    expect(
      result.sessions.reduce((sum, item) => sum + item.plannedMinutes, 0),
    ).toBe(240);
    expect(result.unallocated).toEqual([]);
  });

  it("mantém esforço que não cabe explicitamente não alocado", () => {
    const base = input();
    const result = allocateSessions(
      input({
        availability: [
          {
            id: "11000000-0000-4000-8000-000000000011",
            dayOfWeek: 1,
            startLocal: "18:00:00",
            endLocal: "18:20:00",
          },
        ],
        activities: [{ ...base.activities[0]!, remainingMinutes: 50 }],
      }),
    );

    expect(result.sessions).toEqual([]);
    expect(result.unallocated).toEqual([{ activityId, minutes: 50 }]);
  });

  it("é determinístico para permutações das atividades", () => {
    const base = input();
    const second = {
      ...base.activities[0]!,
      id: "11000000-0000-4000-8000-000000000022",
      priority: 4,
    };
    const first = { ...base.activities[0]!, remainingMinutes: 50 };

    expect(allocateSessions(input({ activities: [first, second] }))).toEqual(
      allocateSessions(input({ activities: [second, first] })),
    );
  });

  it("PT INV-002 / INV-003 / INV-006 — conserva esforço, prazo, limite e não sobreposição", () => {
    fc.assert(
      fc.property(
        fc.record({
          remainingMinutes: fc.integer({ min: 25, max: 360 }),
          preferredSessionMinutes: fc.integer({ min: 25, max: 120 }),
          dailyLimitMinutes: fc.integer({ min: 25, max: 240 }),
        }),
        ({ remainingMinutes, preferredSessionMinutes, dailyLimitMinutes }) => {
          const base = input();
          const result = allocateSessions(
            input({
              preferences: {
                ...base.preferences,
                preferredSessionMinutes,
                dailyLimitMinutes,
              },
              activities: [{ ...base.activities[0]!, remainingMinutes }],
            }),
          );
          const allocated = result.sessions.reduce(
            (total, session) => total + session.plannedMinutes,
            0,
          );
          const unallocated = result.unallocated.reduce(
            (total, item) => total + item.minutes,
            0,
          );
          const ordered = [...result.sessions].sort((left, right) =>
            left.startsAt.localeCompare(right.startsAt),
          );
          const byDate = new Map<string, number>();

          for (const session of ordered) {
            expect(Date.parse(session.endsAt)).toBeLessThanOrEqual(
              Date.parse(base.activities[0]!.deadlineAt),
            );
            const date = session.startsAt.slice(0, 10);
            byDate.set(date, (byDate.get(date) ?? 0) + session.plannedMinutes);
          }
          for (let index = 1; index < ordered.length; index += 1) {
            expect(Date.parse(ordered[index - 1]!.endsAt)).toBeLessThanOrEqual(
              Date.parse(ordered[index]!.startsAt),
            );
          }
          expect(
            [...byDate.values()].every((load) => load <= dailyLimitMinutes),
          ).toBe(true);
          expect(allocated + unallocated).toBe(remainingMinutes);
        },
      ),
      { numRuns: 100 },
    );
  });
});
