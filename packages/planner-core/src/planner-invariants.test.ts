import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  PLANNER_CORE_CONTRACT_VERSION,
  PLANNER_CORE_VERSION,
  PLANNER_RULES_VERSION,
  calculateCapacity,
  diagnosePlan,
  listOperationalWindows,
  proposeReplanning,
  rankActivities,
  type PlannerInput,
} from "./index";

const ids = {
  availability: "11000000-0000-4000-8000-000000000011",
  activity: "11000000-0000-4000-8000-000000000021",
  secondActivity: "11000000-0000-4000-8000-000000000022",
  block: "11000000-0000-4000-8000-000000000031",
  session: "11000000-0000-4000-8000-000000000041",
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
        id: ids.availability,
        dayOfWeek: 1,
        startLocal: "18:00:00",
        endLocal: "21:00:00",
      },
    ],
    blocks: [],
    activities: [
      {
        id: ids.activity,
        deadlineAt: "2026-09-18T02:59:00Z",
        remainingMinutes: 100,
        priority: 2,
        status: "not_started",
        createdAt: "2026-09-10T12:00:00Z",
        dependencyIds: [],
      },
    ],
    protectedSessions: [],
    ...overrides,
  };
}

describe("PT planner-core — invariantes e casos extremos consolidados", () => {
  it("INV-001 — coleções equivalentes produzem a mesma proposta", () => {
    const base = input();
    const second = {
      ...base.activities[0]!,
      id: ids.secondActivity,
      remainingMinutes: 50,
    };
    const block = {
      id: ids.block,
      startsAt: "2026-09-14T22:00:00Z",
      endsAt: "2026-09-14T22:30:00Z",
      kind: "calendar_block" as const,
    };

    expect(
      diagnosePlan(
        input({ activities: [base.activities[0]!, second], blocks: [block] }),
      ),
    ).toEqual(
      diagnosePlan(
        input({ activities: [second, base.activities[0]!], blocks: [block] }),
      ),
    );
  });

  it("INV-002 — bloqueios gerados nunca são sobrepostos", () => {
    fc.assert(
      fc.property(
        fc.record({
          start: fc.integer({ min: 0, max: 120 }),
          duration: fc.integer({ min: 10, max: 60 }),
        }),
        ({ start, duration }) => {
          const blockStart =
            Date.parse("2026-09-14T21:00:00Z") + start * 60_000;
          const blockEnd = blockStart + duration * 60_000;
          const result = diagnosePlan(
            input({
              blocks: [
                {
                  id: ids.block,
                  startsAt: new Date(blockStart).toISOString(),
                  endsAt: new Date(blockEnd).toISOString(),
                  kind: "calendar_block",
                },
              ],
            }),
          );
          expect(
            result.sessions.every(
              (session) =>
                Date.parse(session.endsAt) <= blockStart ||
                Date.parse(session.startsAt) >= blockEnd,
            ),
          ).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("INV-005 — proteção gerada é preservada ou explica o conflito", () => {
    fc.assert(
      fc.property(fc.integer({ min: 25, max: 150 }), (minutes) => {
        const protectedSession = {
          id: ids.session,
          activityId: ids.activity,
          startsAt: "2026-09-14T21:00:00Z",
          endsAt: new Date(
            Date.parse("2026-09-14T21:00:00Z") + minutes * 60_000,
          ).toISOString(),
          actualMinutes: 0,
          protection: "pinned" as const,
        };
        const result = proposeReplanning(
          input({ protectedSessions: [protectedSession] }),
        );
        expect(result.keptSessions).toEqual([protectedSession]);
        if (result.conflicts.length > 0) {
          expect(result.conflicts[0]!.code).toBe("protected_capacity");
        }
      }),
      { numRuns: 100 },
    );
  });

  it("INV-010 / CE-008 — preserva intenção civil ao mudar o fuso", () => {
    const saoPaulo = listOperationalWindows(input())[0]!;
    const lisbon = listOperationalWindows(
      input({ timezone: "Europe/Lisbon" }),
    )[0]!;

    expect(saoPaulo.startsAt).toBe("2026-09-14T21:00:00.000Z");
    expect(lisbon.startsAt).toBe("2026-09-14T17:00:00.000Z");
    expect(saoPaulo.minutes).toBe(lisbon.minutes);
  });

  it("INV-010 / CE-009 — rejeita horário DST inexistente ou ambíguo", () => {
    const base = input({
      timezone: "America/New_York",
      generatedAt: "2026-03-01T12:00:00Z",
      horizonStartDate: "2026-03-08",
      horizonEndDate: "2026-03-08",
      availability: [
        {
          id: ids.availability,
          dayOfWeek: 0,
          startLocal: "02:30:00",
          endLocal: "03:30:00",
        },
      ],
    });
    expect(() => calculateCapacity(base)).toThrow("Horário local inexistente");

    expect(() =>
      calculateCapacity({
        ...base,
        generatedAt: "2026-10-25T12:00:00Z",
        horizonStartDate: "2026-11-01",
        horizonEndDate: "2026-11-01",
        availability: [
          {
            ...base.availability[0]!,
            startLocal: "01:30:00",
            endLocal: "02:30:00",
          },
        ],
      }),
    ).toThrow("Horário local ambíguo");
  });

  it("INV-012 / CE-010 — prioridade manual explica desempates gerados", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 0, max: 4 }), {
          minLength: 2,
          maxLength: 2,
        }),
        ([firstPriority, secondPriority]) => {
          const base = input();
          const activities = [
            { ...base.activities[0]!, priority: firstPriority! },
            {
              ...base.activities[0]!,
              id: ids.secondActivity,
              priority: secondPriority!,
            },
          ];
          const ranked = rankActivities(input({ activities }));
          expect(ranked[0]!.factors.manualPriority).toBe(
            Math.max(firstPriority!, secondPriority!),
          );
          expect(ranked[0]!.decidingFactor).toBe("manual_priority");
        },
      ),
      { numRuns: 25 },
    );
  });

  it("CE-006 — consolida janelas sobrepostas sem duplicar capacidade", () => {
    const base = input();
    const result = calculateCapacity(
      input({
        availability: [
          {
            ...base.availability[0]!,
            startLocal: "18:00:00",
            endLocal: "20:00:00",
          },
          {
            ...base.availability[0]!,
            id: "11000000-0000-4000-8000-000000000012",
            startLocal: "19:00:00",
            endLocal: "21:00:00",
          },
        ],
      }),
    );
    expect(result.totals.grossMinutes).toBe(180);
  });
});
