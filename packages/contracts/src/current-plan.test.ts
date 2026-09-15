import { describe, expect, it } from "vitest";

import { currentPlanProjectionSchema } from "./current-plan";

export const currentPlanFixture = {
  contractVersion: 1,
  plan: {
    planId: "95000000-0000-4000-8000-000000000031",
    version: 3,
    status: "published",
    feasibility: "feasible",
    timezone: "America/Sao_Paulo",
    horizonStartDate: "2026-09-15",
    horizonEndDate: "2026-09-21",
    plannerVersion: "planner-core-v1",
    rulesVersion: "planner-rules-v1",
    publishedAt: "2026-09-15T12:00:00Z",
  },
  capacity: {
    grossMinutes: 600,
    operationalMinutes: 500,
    netMinutes: 400,
    allocatedMinutes: 150,
    balanceMinutes: 250,
  },
  activities: [
    {
      activityId: "95000000-0000-4000-8000-000000000021",
      title: "Atividade sintética",
      disciplineId: null,
      deadlineAt: "2026-09-20T02:59:00Z",
      status: "in_progress",
      estimatedMinutes: 100,
      actualMinutes: 25,
      progressPercent: 25,
      risk: {
        activityId: "95000000-0000-4000-8000-000000000021",
        level: "attention",
        slackMinutes: 250,
        loadRate: 0.5,
      },
    },
  ],
  sessions: [
    {
      sessionId: "95000000-0000-4000-8000-000000000041",
      activityId: "95000000-0000-4000-8000-000000000021",
      startsAt: "2026-09-16T21:00:00Z",
      endsAt: "2026-09-16T21:50:00Z",
      plannedMinutes: 50,
      status: "scheduled",
      isPinned: false,
      source: "automatic",
      rationaleCode: "earliest_deadline",
    },
  ],
} as const;

describe("current plan projection contract", () => {
  it("accepts one version shared by every consumer", () => {
    expect(currentPlanProjectionSchema.parse(currentPlanFixture)).toEqual(
      currentPlanFixture,
    );
  });

  it("rejects proposals and inconsistent progress", () => {
    expect(
      currentPlanProjectionSchema.safeParse({
        ...currentPlanFixture,
        plan: { ...currentPlanFixture.plan, status: "proposal" },
      }).success,
    ).toBe(false);
    expect(
      currentPlanProjectionSchema.safeParse({
        ...currentPlanFixture,
        activities: [
          { ...currentPlanFixture.activities[0], progressPercent: 101 },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects values mixed across plan projections", () => {
    expect(
      currentPlanProjectionSchema.safeParse({
        ...currentPlanFixture,
        capacity: { ...currentPlanFixture.capacity, balanceMinutes: 251 },
      }).success,
    ).toBe(false);
    expect(
      currentPlanProjectionSchema.safeParse({
        ...currentPlanFixture,
        sessions: [
          {
            ...currentPlanFixture.sessions[0],
            activityId: "95000000-0000-4000-8000-000000000099",
          },
        ],
      }).success,
    ).toBe(false);
  });
});
