import { describe, expect, it, vi } from "vitest";

import type {
  PlannerInput,
  PlannerOutput,
} from "../../../packages/planner-core/src/index.ts";
import type { GenerateDecision } from "./generate-core";
import {
  persistGeneratedProposal,
  type ProposalPersistenceClient,
} from "./proposal-persistence";

const generation = {
  ok: true,
  userId: "11000000-0000-4000-8000-000000000001",
  request: {
    contractVersion: 1,
    reason: "manual_request",
    horizonDays: 7,
    expectedCurrentPlanId: null,
  },
  input: { horizonStartDate: "2026-09-14" } as PlannerInput,
  output: { feasibility: "feasible" } as PlannerOutput,
} satisfies Extract<GenerateDecision, { ok: true }>;

describe("planner proposal persistence", () => {
  it("passes the validated snapshots and correlation to the atomic RPC", async () => {
    const rpc = vi.fn(async () => ({
      data: {
        proposal: {
          planId: "11000000-0000-4000-8000-000000000031",
          version: 1,
        },
        output: { feasibility: "feasible" },
        replayed: false,
      },
      error: null,
    }));

    await expect(
      persistGeneratedProposal(
        { rpc } as ProposalPersistenceClient,
        generation,
        "correlation-1",
        { keyHash: "a".repeat(64), requestHash: "b".repeat(64) },
      ),
    ).resolves.toMatchObject({ ok: true });
    expect(rpc).toHaveBeenCalledWith("persist_idempotent_plan_proposal", {
      p_correlation_id: "correlation-1",
      p_expected_current_plan_id: null,
      p_generation_reason: "manual_request",
      p_idempotency_key_hash: "a".repeat(64),
      p_input: generation.input,
      p_output: generation.output,
      p_request_hash: "b".repeat(64),
    });
  });

  it.each([
    ["STALE_PLAN", "STALE_PLAN", 409],
    ["IDEMPOTENCY_CONFLICT", "IDEMPOTENCY_CONFLICT", 409],
    ["database failure", "INTERNAL_ERROR", 500],
  ] as const)(
    "maps %s without exposing database details",
    async (message, code, statusCode) => {
      const client = {
        rpc: async () => ({ data: null, error: { message } }),
      } as ProposalPersistenceClient;

      await expect(
        persistGeneratedProposal(client, generation, "correlation-2", {
          keyHash: "a".repeat(64),
          requestHash: "b".repeat(64),
        }),
      ).resolves.toEqual({ ok: false, code, statusCode });
    },
  );

  it("uses the persisted output when replaying the original response", async () => {
    const originalOutput = { outputHash: "c".repeat(64) };
    const client = {
      rpc: async () => ({
        data: {
          proposal: { planId: "11000000-0000-4000-8000-000000000031" },
          output: originalOutput,
          replayed: true,
        },
        error: null,
      }),
    } as ProposalPersistenceClient;

    await expect(
      persistGeneratedProposal(client, generation, "correlation-3", {
        keyHash: "a".repeat(64),
        requestHash: "b".repeat(64),
      }),
    ).resolves.toEqual({
      ok: true,
      proposal: { planId: "11000000-0000-4000-8000-000000000031" },
      output: originalOutput,
      replayed: true,
    });
  });

  it("uses the isolated idempotency scope for impact", async () => {
    const rpc = vi.fn(async () => ({
      data: {
        proposal: { planId: "11000000-0000-4000-8000-000000000031" },
        output: { feasibility: "feasible" },
        replayed: false,
      },
      error: null,
    }));

    await persistGeneratedProposal(
      { rpc } as ProposalPersistenceClient,
      generation,
      "correlation-impact",
      { keyHash: "a".repeat(64), requestHash: "b".repeat(64) },
      "impact",
    );

    expect(rpc).toHaveBeenCalledWith(
      "persist_idempotent_plan_impact",
      expect.any(Object),
    );
  });
});
