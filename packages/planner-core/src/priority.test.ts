import { describe, expect, it } from "vitest";

import {
  PLANNER_CORE_CONTRACT_VERSION,
  PLANNER_CORE_VERSION,
  PLANNER_RULES_VERSION,
  rankActivities,
  type PlannerInput,
} from "./index";

const activityIds = [
  "11000000-0000-4000-8000-000000000021",
  "11000000-0000-4000-8000-000000000022",
  "11000000-0000-4000-8000-000000000023",
] as const;

function baseInput(): PlannerInput {
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
        endLocal: "23:00:00",
      },
      {
        id: "11000000-0000-4000-8000-000000000012",
        dayOfWeek: 2,
        startLocal: "18:00:00",
        endLocal: "23:00:00",
      },
    ],
    blocks: [],
    activities: [],
    protectedSessions: [],
  };
}

function activity(
  id: string,
  overrides: Partial<PlannerInput["activities"][number]> = {},
): PlannerInput["activities"][number] {
  return {
    id,
    deadlineAt: "2026-09-16T02:00:00Z",
    remainingMinutes: 50,
    priority: 2,
    status: "not_started",
    createdAt: "2026-09-10T12:00:00Z",
    dependencyIds: [],
    ...overrides,
  };
}

describe("UT planner-core — prioridade determinística v1", () => {
  it("aplica vencida, horizonte inviável e menor prazo nesta ordem", () => {
    const ranked = rankActivities({
      ...baseInput(),
      activities: [
        activity(activityIds[2], { deadlineAt: "2026-09-15T02:00:00Z" }),
        activity(activityIds[1], {
          deadlineAt: "2026-09-16T02:00:00Z",
          remainingMinutes: 600,
        }),
        activity(activityIds[0], { deadlineAt: "2026-09-13T02:00:00Z" }),
      ],
    });

    expect(ranked.map(({ activityId }) => activityId)).toEqual([
      activityIds[0],
      activityIds[1],
      activityIds[2],
    ]);
    expect(ranked[0]?.decidingFactor).toBe("overdue");
    expect(ranked[1]?.decidingFactor).toBe("infeasible_horizon");
  });

  it("prefere o menor prazo quando os estados de risco prioritários empatam", () => {
    const ranked = rankActivities({
      ...baseInput(),
      generatedAt: "2026-09-01T12:00:00Z",
      activities: [
        activity(activityIds[1], { deadlineAt: "2026-09-16T02:00:00Z" }),
        activity(activityIds[0], { deadlineAt: "2026-09-15T02:00:00Z" }),
      ],
    });

    expect(ranked[0]?.activityId).toBe(activityIds[0]);
    expect(ranked[0]?.decidingFactor).toBe("earliest_deadline");
  });

  it("CE-010 — desempata por prioridade, esforço, iniciada e criação", () => {
    const sameDeadline = "2026-09-16T02:00:00Z";
    const scenarios = [
      {
        expectedFactor: "manual_priority",
        first: { priority: 4 },
        second: { priority: 1 },
      },
      {
        expectedFactor: "largest_remaining_effort",
        first: { remainingMinutes: 75 },
        second: { remainingMinutes: 50 },
      },
      {
        expectedFactor: "already_started",
        first: { status: "in_progress" as const },
        second: { status: "not_started" as const },
      },
      {
        expectedFactor: "oldest_activity",
        first: { createdAt: "2026-09-09T12:00:00Z" },
        second: { createdAt: "2026-09-10T12:00:00Z" },
      },
    ] as const;

    for (const scenario of scenarios) {
      const ranked = rankActivities({
        ...baseInput(),
        activities: [
          activity(activityIds[1], {
            deadlineAt: sameDeadline,
            ...scenario.second,
          }),
          activity(activityIds[0], {
            deadlineAt: sameDeadline,
            ...scenario.first,
          }),
        ],
      });

      expect(ranked[0]?.activityId).toBe(activityIds[0]);
      expect(ranked[0]?.decidingFactor).toBe(scenario.expectedFactor);
    }
  });

  it("INV-001 — permutar a entrada não altera ranking nem fatores", () => {
    const activities = [
      activity(activityIds[2], { priority: 1 }),
      activity(activityIds[0], { priority: 4 }),
      activity(activityIds[1], { priority: 3 }),
    ];
    const expected = rankActivities({ ...baseInput(), activities });

    for (const permutation of [
      [...activities].reverse(),
      [activities[1]!, activities[2]!, activities[0]!],
    ]) {
      expect(
        rankActivities({ ...baseInput(), activities: permutation }),
      ).toEqual(expected);
    }
  });

  it("INV-012 — expõe o fator e os valores que decidiram a recomendação", () => {
    const ranked = rankActivities({
      ...baseInput(),
      activities: [
        activity(activityIds[1], { priority: 1 }),
        activity(activityIds[0], { priority: 4 }),
      ],
    });

    expect(ranked[0]).toMatchObject({
      activityId: activityIds[0],
      decidingFactor: "manual_priority",
      factors: { manualPriority: 4 },
    });
    expect(ranked[1]?.factors.manualPriority).toBe(1);
  });

  it("usa ID somente como fallback determinístico, nunca como fator de produto", () => {
    const ranked = rankActivities({
      ...baseInput(),
      activities: [activity(activityIds[1]), activity(activityIds[0])],
    });

    expect(ranked.map(({ activityId }) => activityId)).toEqual([
      activityIds[0],
      activityIds[1],
    ]);
    expect(ranked[0]?.decidingFactor).toBe("stable_id");
  });
});
