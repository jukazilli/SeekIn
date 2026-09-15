import { describe, expect, it, vi } from "vitest";

import { confirmFirstPlan, generateFirstPlan } from "./planner-flow";

const proposal = {
  capacity: {
    allocatedMinutes: 50,
    grossMinutes: 120,
    netMinutes: 96,
    operationalMinutes: 120,
  },
  conflicts: [],
  feasibility: "feasible",
  planId: "95000000-0000-4000-8000-000000000056",
  requiresConfirmation: true,
  sessions: [],
  status: "proposal",
  unallocated: [],
  version: 1,
};

describe("SKN-056 onboarding planner commands", () => {
  it("generates a proposal with the onboarding reason", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { data: proposal },
      error: null,
    });
    await expect(
      generateFirstPlan({ invoke }, "generation-key"),
    ).resolves.toEqual({ data: proposal, ok: true });
    expect(invoke).toHaveBeenCalledWith("planner/generate", {
      body: {
        contractVersion: 1,
        expectedCurrentPlanId: null,
        horizonDays: 90,
        reason: "onboarding_completed",
      },
      headers: { "Idempotency-Key": "generation-key" },
    });
  });

  it("keeps a useful retry message when generation fails", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { error: { message: "O planejamento demorou. Tente novamente." } },
      error: new Error("timeout"),
    });
    await expect(generateFirstPlan({ invoke }, "retry-key")).resolves.toEqual({
      message: "O planejamento demorou. Tente novamente.",
      ok: false,
    });
  });

  it("confirms the proposal explicitly", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { data: { planId: proposal.planId, status: "published" } },
      error: null,
    });
    await expect(
      confirmFirstPlan({ invoke }, proposal.planId, "confirmation-key"),
    ).resolves.toEqual({ data: { planId: proposal.planId }, ok: true });
    expect(invoke).toHaveBeenCalledWith("planner/confirm", {
      body: {
        contractVersion: 1,
        expectedCurrentPlanId: null,
        planId: proposal.planId,
      },
      headers: { "Idempotency-Key": "confirmation-key" },
    });
  });
});
