import { PLANNER_CORE_CONTRACT_VERSION } from "../../../packages/planner-core/src/index.ts";
import type { Json } from "../../../packages/contracts/src/index.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ProposalResolutionRequest = {
  contractVersion: 1;
  planId: string;
  expectedCurrentPlanId: string | null;
};

export type ProposalResolutionResult = {
  planId: string;
  version: number;
  status: "published" | "rejected";
  currentPlanId: string | null;
  replayed: boolean;
};

export type ProposalResolutionDecision =
  | { ok: true; result: ProposalResolutionResult }
  | {
      ok: false;
      code:
        | "AUTH_REQUIRED"
        | "SESSION_INVALID"
        | "UNSUPPORTED_CONTRACT_VERSION"
        | "VALIDATION_ERROR"
        | "RESOURCE_NOT_FOUND"
        | "STALE_PLAN"
        | "IDEMPOTENCY_CONFLICT"
        | "INTERNAL_ERROR";
      statusCode: 400 | 401 | 404 | 409 | 422 | 500;
    };

export interface ProposalResolutionClient {
  rpc(
    name: "resolve_plan_proposal",
    parameters: {
      p_action: "confirm" | "reject";
      p_plan_id: string;
      p_expected_current_plan_id: string | null;
      p_correlation_id: string;
      p_idempotency_key_hash: string;
      p_request_hash: string;
    },
  ): PromiseLike<{ data: Json | null; error: { message: string } | null }>;
}

function parseRequest(value: unknown): ProposalResolutionRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).sort().join("|") !==
      "contractVersion|expectedCurrentPlanId|planId" ||
    record.contractVersion !== PLANNER_CORE_CONTRACT_VERSION ||
    !UUID_PATTERN.test(String(record.planId)) ||
    !(
      record.expectedCurrentPlanId === null ||
      UUID_PATTERN.test(String(record.expectedCurrentPlanId))
    )
  ) {
    return null;
  }
  return value as ProposalResolutionRequest;
}

function parseResult(value: Json | null): ProposalResolutionResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, Json | undefined>;
  if (
    !UUID_PATTERN.test(String(record.planId)) ||
    !Number.isInteger(record.version) ||
    Number(record.version) < 1 ||
    (record.status !== "published" && record.status !== "rejected") ||
    !(
      record.currentPlanId === null ||
      UUID_PATTERN.test(String(record.currentPlanId))
    ) ||
    typeof record.replayed !== "boolean"
  ) {
    return null;
  }
  return record as ProposalResolutionResult;
}

export async function resolveAuthenticatedProposal(
  authorization: string | null,
  rawRequest: unknown,
  action: "confirm" | "reject",
  context: {
    correlationId: string;
    idempotency: { keyHash: string; requestHash: string };
  },
  dependencies: {
    authenticate(bearerToken: string): Promise<string | null>;
    client: ProposalResolutionClient;
  },
): Promise<ProposalResolutionDecision> {
  if (!authorization?.startsWith("Bearer "))
    return { ok: false, code: "AUTH_REQUIRED", statusCode: 401 };

  const request = parseRequest(rawRequest);
  if (!request) {
    const unsupported =
      typeof rawRequest === "object" &&
      rawRequest !== null &&
      "contractVersion" in rawRequest &&
      rawRequest.contractVersion !== PLANNER_CORE_CONTRACT_VERSION;
    return {
      ok: false,
      code: unsupported ? "UNSUPPORTED_CONTRACT_VERSION" : "VALIDATION_ERROR",
      statusCode: unsupported ? 400 : 422,
    };
  }

  try {
    if (!(await dependencies.authenticate(authorization)))
      return { ok: false, code: "SESSION_INVALID", statusCode: 401 };
  } catch {
    return { ok: false, code: "SESSION_INVALID", statusCode: 401 };
  }

  const { data, error } = await dependencies.client.rpc(
    "resolve_plan_proposal",
    {
      p_action: action,
      p_plan_id: request.planId,
      p_expected_current_plan_id: request.expectedCurrentPlanId,
      p_correlation_id: context.correlationId,
      p_idempotency_key_hash: context.idempotency.keyHash,
      p_request_hash: context.idempotency.requestHash,
    },
  );
  if (error) {
    if (error.message === "RESOURCE_NOT_FOUND")
      return { ok: false, code: "RESOURCE_NOT_FOUND", statusCode: 404 };
    if (error.message === "STALE_PLAN")
      return { ok: false, code: "STALE_PLAN", statusCode: 409 };
    if (error.message === "IDEMPOTENCY_CONFLICT")
      return { ok: false, code: "IDEMPOTENCY_CONFLICT", statusCode: 409 };
    return { ok: false, code: "INTERNAL_ERROR", statusCode: 500 };
  }

  const result = parseResult(data);
  if (!result) return { ok: false, code: "INTERNAL_ERROR", statusCode: 500 };
  return { ok: true, result };
}
