import { describe, expect, it, vi } from "vitest";

import {
  PLANNER_CORE_CONTRACT_VERSION,
  PLANNER_CORE_VERSION,
  PLANNER_RULES_VERSION,
  type PlannerInput,
} from "../../../packages/planner-core/src";
import {
  generateImpactProposal,
  ImpactResourceNotFound,
  type ImpactLoader,
} from "./impact-core";

const request = {
  contractVersion: 1 as const,
  trigger: {
    type: "activity_changed" as const,
    entityId: "11000000-0000-4000-8000-000000000021",
  },
  expectedCurrentPlanId: "11000000-0000-4000-8000-000000000031",
};

function input(): PlannerInput {
  return {
    contractVersion: PLANNER_CORE_CONTRACT_VERSION,
    plannerVersion: PLANNER_CORE_VERSION,
    rulesVersion: PLANNER_RULES_VERSION,
    generatedAt: "2026-09-14T12:00:00Z",
    timezone: "America/Sao_Paulo",
    horizonStartDate: "2026-09-14",
    horizonEndDate: "2026-12-12",
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
        id: request.trigger.entityId,
        deadlineAt: "2026-09-16T02:59:00Z",
        remainingMinutes: 50,
        priority: 2,
        status: "not_started",
        createdAt: "2026-09-13T12:00:00Z",
        dependencyIds: [],
      },
    ],
    protectedSessions: [],
  };
}

describe("planner impact use case", () => {
  it("produces a diff against the current plan without mutating it", async () => {
    const loader: ImpactLoader = {
      load: vi.fn(async () => ({
        input: input(),
        currentSessions: [
          {
            sessionId: "11000000-0000-4000-8000-000000000041",
            activityId: request.trigger.entityId,
            startsAt: "2026-09-14T21:00:00.000Z",
            endsAt: "2026-09-14T21:50:00.000Z",
            plannedMinutes: 50,
          },
        ],
      })),
    };
    const result = await generateImpactProposal("Bearer synthetic", request, {
      authenticate: async () => "11000000-0000-4000-8000-000000000001",
      loader,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request).toMatchObject({
      reason: "activity_changed",
      expectedCurrentPlanId: request.expectedCurrentPlanId,
    });
    expect(result.output.sessions[0]?.sessionId).toBe(
      "11000000-0000-4000-8000-000000000041",
    );
    expect(result.output.changes).toEqual({
      created: 0,
      kept: 1,
      moved: 0,
      removed: 0,
    });
  });

  it("returns 404 for a trigger outside the owner boundary", async () => {
    await expect(
      generateImpactProposal("Bearer synthetic", request, {
        authenticate: async () => "11000000-0000-4000-8000-000000000001",
        loader: {
          load: async () => {
            throw new ImpactResourceNotFound();
          },
        },
      }),
    ).resolves.toEqual({
      ok: false,
      code: "RESOURCE_NOT_FOUND",
      statusCode: 404,
    });
  });

  it("rejects unknown triggers and unauthenticated calls", async () => {
    const loader = { load: vi.fn() } as ImpactLoader;
    await expect(
      generateImpactProposal(null, request, {
        authenticate: async () => null,
        loader,
      }),
    ).resolves.toMatchObject({ code: "AUTH_REQUIRED", statusCode: 401 });
    await expect(
      generateImpactProposal(
        "Bearer synthetic",
        { ...request, trigger: { ...request.trigger, type: "unknown" } },
        { authenticate: async () => "user", loader },
      ),
    ).resolves.toMatchObject({ code: "VALIDATION_ERROR", statusCode: 422 });
    expect(loader.load).not.toHaveBeenCalled();
  });
});
