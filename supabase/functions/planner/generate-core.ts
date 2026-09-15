import {
  PLANNER_CORE_CONTRACT_VERSION,
  PLANNER_CORE_VERSION,
  PLANNER_RULES_VERSION,
  calculateCapacity,
  diagnosePlan,
  plannerInputSchema,
  plannerOutputSchema,
  type PlannerInput,
  type PlannerOutput,
} from "../../../packages/planner-core/src/index.ts";

const GENERATION_REASONS = [
  "manual_request",
  "onboarding_completed",
  "availability_changed",
  "block_changed",
  "activity_changed",
  "session_completed",
  "session_skipped",
  "session_moved",
] as const;

export type GenerateRequest = {
  contractVersion: 1;
  reason: (typeof GENERATION_REASONS)[number];
  horizonDays: number;
  expectedCurrentPlanId: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseGenerateRequest(value: unknown): GenerateRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const expectedKeys = [
    "contractVersion",
    "expectedCurrentPlanId",
    "horizonDays",
    "reason",
  ];
  if (
    Object.keys(record).sort().join("|") !== expectedKeys.join("|") ||
    record.contractVersion !== PLANNER_CORE_CONTRACT_VERSION ||
    !GENERATION_REASONS.includes(
      record.reason as (typeof GENERATION_REASONS)[number],
    ) ||
    !Number.isInteger(record.horizonDays) ||
    Number(record.horizonDays) < 1 ||
    Number(record.horizonDays) > 90 ||
    !(
      record.expectedCurrentPlanId === null ||
      (typeof record.expectedCurrentPlanId === "string" &&
        UUID_PATTERN.test(record.expectedCurrentPlanId))
    )
  ) {
    return null;
  }
  return record as GenerateRequest;
}

export interface PlannerInputLoader {
  load(userId: string, request: GenerateRequest): Promise<unknown>;
}

export type GenerateDecision =
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
        | "DEPENDENCY_UNAVAILABLE"
        | "INTERNAL_ERROR";
      statusCode: 400 | 401 | 422 | 500 | 503;
    };

export interface GenerateDependencies {
  authenticate(bearerToken: string): Promise<string | null>;
  loader: PlannerInputLoader;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(stableJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function uuidFromHash(hash: string): string {
  const value = hash.slice(0, 32).split("");
  value[12] = "4";
  value[16] = ((Number.parseInt(value[16]!, 16) & 0x3) | 0x8).toString(16);
  const hex = value.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function executePlanner(input: PlannerInput): Promise<PlannerOutput> {
  const inputHash = await sha256(input);
  const draft = diagnosePlan(input);
  const capacity = calculateCapacity(input).totals;
  const sessions = await Promise.all(
    draft.sessions.map(async (session) => ({
      sessionId: uuidFromHash(
        await sha256({
          activityId: session.activityId,
          endsAt: session.endsAt,
          inputHash,
          startsAt: session.startsAt,
        }),
      ),
      activityId: session.activityId,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      plannedMinutes: session.plannedMinutes,
      changeKind: "created" as const,
      rationaleCode: session.rationaleCode,
    })),
  );
  const allocatedMinutes = sessions.reduce(
    (total, session) => total + session.plannedMinutes,
    0,
  );
  const unsigned = {
    contractVersion: PLANNER_CORE_CONTRACT_VERSION,
    plannerVersion: PLANNER_CORE_VERSION,
    rulesVersion: PLANNER_RULES_VERSION,
    feasibility: draft.feasibility,
    requiresConfirmation: true as const,
    capacity: {
      grossMinutes: capacity.grossMinutes,
      operationalMinutes: capacity.operationalMinutes,
      netMinutes: capacity.netMinutes,
      allocatedMinutes,
    },
    sessions,
    activityRisks: draft.activityRisks,
    unallocated: draft.unallocated,
    conflicts: draft.conflicts,
    changes: {
      created: sessions.length,
      kept: 0,
      moved: 0,
      removed: 0,
    },
    inputHash,
  };

  return plannerOutputSchema.parse({
    ...unsigned,
    outputHash: await sha256(unsigned),
  });
}

export async function generateAuthenticatedPlan(
  authorization: string | null,
  rawRequest: unknown,
  dependencies: GenerateDependencies,
): Promise<GenerateDecision> {
  if (!authorization?.startsWith("Bearer ")) {
    return { ok: false, code: "AUTH_REQUIRED", statusCode: 401 };
  }

  const parsedRequest = parseGenerateRequest(rawRequest);
  if (!parsedRequest) {
    const unsupportedVersion =
      typeof rawRequest === "object" &&
      rawRequest !== null &&
      "contractVersion" in rawRequest &&
      rawRequest.contractVersion !== PLANNER_CORE_CONTRACT_VERSION;
    return {
      ok: false,
      code: unsupportedVersion
        ? "UNSUPPORTED_CONTRACT_VERSION"
        : "VALIDATION_ERROR",
      statusCode: unsupportedVersion ? 400 : 422,
    };
  }

  let userId: string | null;
  try {
    userId = await dependencies.authenticate(authorization);
  } catch {
    return { ok: false, code: "SESSION_INVALID", statusCode: 401 };
  }
  if (!userId) {
    return { ok: false, code: "SESSION_INVALID", statusCode: 401 };
  }

  let rawInput: unknown;
  try {
    rawInput = await dependencies.loader.load(userId, parsedRequest);
  } catch {
    return { ok: false, code: "DEPENDENCY_UNAVAILABLE", statusCode: 503 };
  }
  const input = plannerInputSchema.safeParse(rawInput);
  if (!input.success) {
    return { ok: false, code: "VALIDATION_ERROR", statusCode: 422 };
  }

  try {
    return {
      ok: true,
      input: input.data,
      output: await executePlanner(input.data),
      request: parsedRequest,
      userId,
    };
  } catch {
    return { ok: false, code: "INTERNAL_ERROR", statusCode: 500 };
  }
}
