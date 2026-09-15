import {
  PLANNER_CORE_CONTRACT_VERSION,
  plannerInputSchema,
  type CurrentPlanSession,
  type PlannerInput,
  type PlannerOutput,
} from "../../../packages/planner-core/src/index.ts";
import { executePlanner, type GenerateRequest } from "./generate-core.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRIGGERS = [
  "activity_changed",
  "availability_changed",
  "block_changed",
] as const;

export type ImpactRequest = {
  contractVersion: 1;
  trigger: { type: (typeof TRIGGERS)[number]; entityId: string };
  expectedCurrentPlanId: string;
};

export class ImpactResourceNotFound extends Error {}
export class ImpactStalePlan extends Error {}

function parseImpactRequest(value: unknown): ImpactRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const trigger = record.trigger;
  if (!trigger || typeof trigger !== "object" || Array.isArray(trigger))
    return null;
  const triggerRecord = trigger as Record<string, unknown>;
  if (
    Object.keys(record).sort().join("|") !==
      "contractVersion|expectedCurrentPlanId|trigger" ||
    Object.keys(triggerRecord).sort().join("|") !== "entityId|type" ||
    record.contractVersion !== PLANNER_CORE_CONTRACT_VERSION ||
    !UUID_PATTERN.test(String(record.expectedCurrentPlanId)) ||
    !TRIGGERS.includes(triggerRecord.type as (typeof TRIGGERS)[number]) ||
    !UUID_PATTERN.test(String(triggerRecord.entityId))
  ) {
    return null;
  }
  return value as ImpactRequest;
}

export interface ImpactLoader {
  load(
    userId: string,
    request: ImpactRequest,
    generationRequest: GenerateRequest,
  ): Promise<{ input: unknown; currentSessions: CurrentPlanSession[] }>;
}

export type ImpactDecision =
  | {
      ok: true;
      input: PlannerInput;
      output: PlannerOutput;
      request: GenerateRequest;
      userId: string;
    }
  | {
      ok: false;
      code:
        | "AUTH_REQUIRED"
        | "SESSION_INVALID"
        | "UNSUPPORTED_CONTRACT_VERSION"
        | "VALIDATION_ERROR"
        | "RESOURCE_NOT_FOUND"
        | "STALE_PLAN"
        | "DEPENDENCY_UNAVAILABLE"
        | "INTERNAL_ERROR";
      statusCode: 400 | 401 | 404 | 409 | 422 | 500 | 503;
    };

export async function generateImpactProposal(
  authorization: string | null,
  rawRequest: unknown,
  dependencies: {
    authenticate(bearerToken: string): Promise<string | null>;
    loader: ImpactLoader;
  },
): Promise<ImpactDecision> {
  if (!authorization?.startsWith("Bearer "))
    return { ok: false, code: "AUTH_REQUIRED", statusCode: 401 };
  const request = parseImpactRequest(rawRequest);
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
  let userId: string | null;
  try {
    userId = await dependencies.authenticate(authorization);
  } catch {
    return { ok: false, code: "SESSION_INVALID", statusCode: 401 };
  }
  if (!userId) return { ok: false, code: "SESSION_INVALID", statusCode: 401 };

  const generationRequest: GenerateRequest = {
    contractVersion: 1,
    reason: request.trigger.type,
    horizonDays: 90,
    expectedCurrentPlanId: request.expectedCurrentPlanId,
  };
  let loaded: Awaited<ReturnType<ImpactLoader["load"]>>;
  try {
    loaded = await dependencies.loader.load(userId, request, generationRequest);
  } catch (error) {
    if (error instanceof ImpactResourceNotFound)
      return { ok: false, code: "RESOURCE_NOT_FOUND", statusCode: 404 };
    if (error instanceof ImpactStalePlan)
      return { ok: false, code: "STALE_PLAN", statusCode: 409 };
    return { ok: false, code: "DEPENDENCY_UNAVAILABLE", statusCode: 503 };
  }
  const input = plannerInputSchema.safeParse(loaded.input);
  if (!input.success)
    return { ok: false, code: "VALIDATION_ERROR", statusCode: 422 };
  try {
    return {
      ok: true,
      input: input.data,
      output: await executePlanner(input.data, loaded.currentSessions),
      request: generationRequest,
      userId,
    };
  } catch {
    return { ok: false, code: "INTERNAL_ERROR", statusCode: 500 };
  }
}
