import type { Json } from "../../../packages/contracts/src/index.ts";
import type { GenerateDecision } from "./generate-core.ts";

type SuccessfulGeneration = Extract<GenerateDecision, { ok: true }>;

export interface ProposalPersistenceClient {
  rpc(
    name: "persist_plan_proposal",
    parameters: {
      p_correlation_id: string;
      p_expected_current_plan_id: string | null;
      p_generation_reason: string;
      p_input: Json;
      p_output: Json;
    },
  ): PromiseLike<{ data: Json | null; error: { message: string } | null }>;
}

export type PersistenceDecision =
  | { ok: true; proposal: Record<string, Json | undefined> }
  | { ok: false; code: "STALE_PLAN" | "INTERNAL_ERROR"; statusCode: 409 | 500 };

export async function persistGeneratedProposal(
  client: ProposalPersistenceClient,
  generation: SuccessfulGeneration,
  correlationId: string,
): Promise<PersistenceDecision> {
  const result = await client.rpc("persist_plan_proposal", {
    p_correlation_id: correlationId,
    p_expected_current_plan_id: generation.request.expectedCurrentPlanId,
    p_generation_reason: generation.request.reason,
    p_input: generation.input as Json,
    p_output: generation.output as Json,
  });
  if (result.error) {
    const stale = result.error.message === "STALE_PLAN";
    return {
      ok: false,
      code: stale ? "STALE_PLAN" : "INTERNAL_ERROR",
      statusCode: stale ? 409 : 500,
    };
  }
  if (
    result.data === null ||
    typeof result.data !== "object" ||
    Array.isArray(result.data)
  ) {
    return { ok: false, code: "INTERNAL_ERROR", statusCode: 500 };
  }
  return { ok: true, proposal: result.data };
}
