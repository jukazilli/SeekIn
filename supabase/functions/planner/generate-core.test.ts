import { describe, expect, it, vi } from "vitest";

import {
  PLANNER_CORE_CONTRACT_VERSION,
  PLANNER_CORE_VERSION,
  PLANNER_RULES_VERSION,
  plannerOutputSchema,
  type PlannerInput,
} from "../../../packages/planner-core/src";
import {
  generateAuthenticatedPlan,
  type GenerateDependencies,
} from "./generate-core";

const USER_ID = "11000000-0000-4000-8000-000000000001";
const AUTHORIZATION = "Bearer synthetic-user-token";
const request = {
  contractVersion: 1 as const,
  reason: "manual_request" as const,
  horizonDays: 7,
  expectedCurrentPlanId: null,
};

function input(): PlannerInput {
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
        endLocal: "20:00:00",
      },
    ],
    blocks: [],
    activities: [
      {
        id: "11000000-0000-4000-8000-000000000021",
        deadlineAt: "2026-09-19T02:59:00Z",
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

function dependencies(overrides: Partial<GenerateDependencies> = {}) {
  return {
    authenticate: vi.fn(async () => USER_ID),
    loader: { load: vi.fn(async () => input()) },
    ...overrides,
  } satisfies GenerateDependencies;
}

describe("planner generate authentication and integration", () => {
  it("rejects requests without authentication before loading private data", async () => {
    const deps = dependencies();

    await expect(
      generateAuthenticatedPlan(null, request, deps),
    ).resolves.toEqual({
      ok: false,
      code: "AUTH_REQUIRED",
      statusCode: 401,
    });
    expect(deps.authenticate).not.toHaveBeenCalled();
    expect(deps.loader.load).not.toHaveBeenCalled();
  });

  it("rejects unknown fields and unsupported contract versions", async () => {
    const deps = dependencies();

    await expect(
      generateAuthenticatedPlan(
        AUTHORIZATION,
        { ...request, privateOverride: true },
        deps,
      ),
    ).resolves.toMatchObject({ code: "VALIDATION_ERROR", statusCode: 422 });
    await expect(
      generateAuthenticatedPlan(
        AUTHORIZATION,
        { ...request, contractVersion: 2 },
        deps,
      ),
    ).resolves.toMatchObject({
      code: "UNSUPPORTED_CONTRACT_VERSION",
      statusCode: 400,
    });
  });

  it("loads only the authenticated owner and validates the planner output", async () => {
    const deps = dependencies();
    const result = await generateAuthenticatedPlan(
      AUTHORIZATION,
      request,
      deps,
    );

    expect(deps.loader.load).toHaveBeenCalledWith(USER_ID, request);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.userId).toBe(USER_ID);
    expect(plannerOutputSchema.safeParse(result.output).success).toBe(true);
    expect(result.output).toMatchObject({
      feasibility: "feasible",
      requiresConfirmation: true,
      changes: { created: 1, kept: 0, moved: 0, removed: 0 },
    });
    expect(result.output.inputHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.output.outputHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic for the same authenticated input", async () => {
    const deps = dependencies();

    const first = await generateAuthenticatedPlan(AUTHORIZATION, request, deps);
    const second = await generateAuthenticatedPlan(
      AUTHORIZATION,
      request,
      deps,
    );

    expect(first).toEqual(second);
  });

  it("maps invalid persisted input and loader failures to stable errors", async () => {
    await expect(
      generateAuthenticatedPlan(
        AUTHORIZATION,
        request,
        dependencies({ loader: { load: async () => ({ invalid: true }) } }),
      ),
    ).resolves.toMatchObject({ code: "VALIDATION_ERROR", statusCode: 422 });
    await expect(
      generateAuthenticatedPlan(
        AUTHORIZATION,
        request,
        dependencies({
          loader: {
            load: async () => Promise.reject(new Error("database offline")),
          },
        }),
      ),
    ).resolves.toMatchObject({
      code: "DEPENDENCY_UNAVAILABLE",
      statusCode: 503,
    });
  });

  it("returns a retryable timeout decision before any output can be persisted", async () => {
    await expect(
      generateAuthenticatedPlan(
        AUTHORIZATION,
        request,
        dependencies({
          loader: { load: () => new Promise(() => undefined) },
          timeoutMs: 1,
        }),
      ),
    ).resolves.toEqual({
      ok: false,
      code: "PLANNER_TIMEOUT",
      statusCode: 503,
    });
  });

  it("rejects an invalid planner output instead of exposing it for persistence", async () => {
    await expect(
      generateAuthenticatedPlan(
        AUTHORIZATION,
        request,
        dependencies({ execute: async () => ({ invalid: true }) as never }),
      ),
    ).resolves.toEqual({
      ok: false,
      code: "INTERNAL_ERROR",
      statusCode: 500,
    });
  });
});
