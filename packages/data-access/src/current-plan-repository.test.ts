import { describe, expect, it, vi } from "vitest";

import {
  createCurrentPlanRepository,
  CurrentPlanRepositoryError,
} from "./current-plan-repository";

const currentPlanFixture = {
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
  capacity: null,
  activities: [],
  sessions: [],
};

describe("current plan repository", () => {
  it("returns the validated canonical projection", async () => {
    const rpc = vi.fn(async () => ({ data: currentPlanFixture, error: null }));
    const repository = createCurrentPlanRepository({ rpc } as never);

    await expect(repository.read()).resolves.toEqual(currentPlanFixture);
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("read_current_plan");
  });

  it("represents absence of a published plan as null", async () => {
    const repository = createCurrentPlanRepository({
      rpc: async () => ({ data: null, error: null }),
    });
    await expect(repository.read()).resolves.toBeNull();
  });

  it("does not expose invalid or failed projections", async () => {
    const failed = createCurrentPlanRepository({
      rpc: async () => ({ data: null, error: { message: "private" } }),
    });
    const invalid = createCurrentPlanRepository({
      rpc: async () => ({ data: { invalid: true }, error: null }),
    });

    await expect(failed.read()).rejects.toBeInstanceOf(
      CurrentPlanRepositoryError,
    );
    await expect(invalid.read()).rejects.toBeInstanceOf(
      CurrentPlanRepositoryError,
    );
  });
});
