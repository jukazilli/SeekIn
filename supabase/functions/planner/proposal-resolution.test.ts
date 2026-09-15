import { describe, expect, it, vi } from "vitest";

import {
  resolveAuthenticatedProposal,
  type ProposalResolutionClient,
} from "./proposal-resolution";

const PLAN_ID = "96000000-0000-4000-8000-000000000032";
const CURRENT_PLAN_ID = "96000000-0000-4000-8000-000000000031";
const request = {
  contractVersion: 1 as const,
  planId: PLAN_ID,
  expectedCurrentPlanId: CURRENT_PLAN_ID,
};
const context = {
  correlationId: "96000000-0000-4000-8000-000000000099",
  idempotency: { keyHash: "a".repeat(64), requestHash: "b".repeat(64) },
};

function dependencies(
  result: Awaited<ReturnType<ProposalResolutionClient["rpc"]>> = {
    data: {
      planId: PLAN_ID,
      version: 2,
      status: "published",
      currentPlanId: PLAN_ID,
      replayed: false,
    },
    error: null,
  },
) {
  return {
    authenticate: vi.fn(async () => "96000000-0000-4000-8000-000000000001"),
    client: { rpc: vi.fn(async () => result) },
  };
}

describe("planner proposal resolution", () => {
  it("rejects unauthenticated and malformed requests before persistence", async () => {
    const deps = dependencies();
    await expect(
      resolveAuthenticatedProposal(null, request, "confirm", context, deps),
    ).resolves.toMatchObject({ code: "AUTH_REQUIRED", statusCode: 401 });
    await expect(
      resolveAuthenticatedProposal(
        "Bearer token",
        { ...request, extra: true },
        "confirm",
        context,
        deps,
      ),
    ).resolves.toMatchObject({ code: "VALIDATION_ERROR", statusCode: 422 });
    expect(deps.client.rpc).not.toHaveBeenCalled();
  });

  it.each(["confirm", "reject"] as const)(
    "passes the %s decision, expected plan and idempotency context",
    async (action) => {
      const deps = dependencies(
        action === "confirm"
          ? undefined
          : {
              data: {
                planId: PLAN_ID,
                version: 2,
                status: "rejected",
                currentPlanId: CURRENT_PLAN_ID,
                replayed: false,
              },
              error: null,
            },
      );
      const result = await resolveAuthenticatedProposal(
        "Bearer token",
        request,
        action,
        context,
        deps,
      );

      expect(result.ok).toBe(true);
      expect(deps.client.rpc).toHaveBeenCalledWith("resolve_plan_proposal", {
        p_action: action,
        p_plan_id: PLAN_ID,
        p_expected_current_plan_id: CURRENT_PLAN_ID,
        p_correlation_id: context.correlationId,
        p_idempotency_key_hash: context.idempotency.keyHash,
        p_request_hash: context.idempotency.requestHash,
      });
    },
  );

  it.each([
    ["RESOURCE_NOT_FOUND", 404],
    ["STALE_PLAN", 409],
    ["IDEMPOTENCY_CONFLICT", 409],
    ["database details", 500],
  ] as const)(
    "maps %s without exposing persistence details",
    async (message, statusCode) => {
      const result = await resolveAuthenticatedProposal(
        "Bearer token",
        request,
        "confirm",
        context,
        dependencies({ data: null, error: { message } }),
      );

      expect(result).toMatchObject({
        ok: false,
        code: statusCode === 500 ? "INTERNAL_ERROR" : message,
        statusCode,
      });
    },
  );

  it("rejects an invalid RPC response", async () => {
    await expect(
      resolveAuthenticatedProposal(
        "Bearer token",
        request,
        "confirm",
        context,
        dependencies({ data: { status: "published" }, error: null }),
      ),
    ).resolves.toEqual({
      ok: false,
      code: "INTERNAL_ERROR",
      statusCode: 500,
    });
  });
});
