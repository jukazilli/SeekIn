import type { Json } from "../../../packages/contracts/src/index.ts";
import type { GenerateDecision } from "./generate-core.ts";

type SuccessfulGeneration = Extract<GenerateDecision, { ok: true }>;

export interface ProposalPersistenceClient {
  rpc(
    name: "persist_idempotent_plan_proposal" | "persist_idempotent_plan_impact",
    parameters: {
      p_correlation_id: string;
      p_expected_current_plan_id: string | null;
      p_generation_reason: string;
      p_idempotency_key_hash: string;
      p_input: Json;
      p_output: Json;
      p_request_hash: string;
    },
  ): PromiseLike<{ data: Json | null; error: { message: string } | null }>;
}

export type PersistenceDecision =
  | {
      ok: true;
      output: Record<string, Json | undefined>;
      proposal: Record<string, Json | undefined>;
      replayed: boolean;
    }
  | {
      ok: false;
      code: "IDEMPOTENCY_CONFLICT" | "STALE_PLAN" | "INTERNAL_ERROR";
      statusCode: 409 | 500;
    };

export async function persistGeneratedProposal(
  client: ProposalPersistenceClient,
  generation: SuccessfulGeneration,
  correlationId: string,
  idempotency: { keyHash: string; requestHash: string },
  command: "generate" | "impact" = "generate",
): Promise<PersistenceDecision> {
  const result = await client.rpc(
    command === "impact"
      ? "persist_idempotent_plan_impact"
      : "persist_idempotent_plan_proposal",
    {
      p_correlation_id: correlationId,
      p_expected_current_plan_id: generation.request.expectedCurrentPlanId,
      p_generation_reason: generation.request.reason,
      p_idempotency_key_hash: idempotency.keyHash,
      p_input: generation.input as Json,
      p_output: generation.output as Json,
      p_request_hash: idempotency.requestHash,
    },
  );
  if (result.error) {
    const stale = result.error.message === "STALE_PLAN";
    const conflict = result.error.message === "IDEMPOTENCY_CONFLICT";
    return {
      ok: false,
      code: stale
        ? "STALE_PLAN"
        : conflict
          ? "IDEMPOTENCY_CONFLICT"
          : "INTERNAL_ERROR",
      statusCode: stale || conflict ? 409 : 500,
    };
  }
  if (
    result.data === null ||
    typeof result.data !== "object" ||
    Array.isArray(result.data)
  ) {
    return { ok: false, code: "INTERNAL_ERROR", statusCode: 500 };
  }
  const envelope = result.data as Record<string, Json | undefined>;
  if (
    !envelope.proposal ||
    typeof envelope.proposal !== "object" ||
    Array.isArray(envelope.proposal) ||
    !envelope.output ||
    typeof envelope.output !== "object" ||
    Array.isArray(envelope.output) ||
    typeof envelope.replayed !== "boolean"
  ) {
    return { ok: false, code: "INTERNAL_ERROR", statusCode: 500 };
  }
  return {
    ok: true,
    proposal: envelope.proposal,
    output: envelope.output,
    replayed: envelope.replayed,
  };
}
