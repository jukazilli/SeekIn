import { z } from "zod";

const uuid = z.uuid();
const plannerErrorSchema = z.object({
  error: z.object({ message: z.string() }),
});

const proposalSchema = z
  .object({
    planId: uuid,
    version: z.number().int().positive(),
    status: z.literal("proposal"),
    feasibility: z.enum(["feasible", "partial", "infeasible"]),
    requiresConfirmation: z.literal(true),
    capacity: z.object({
      grossMinutes: z.number().int().nonnegative(),
      operationalMinutes: z.number().int().nonnegative(),
      netMinutes: z.number().int().nonnegative(),
      allocatedMinutes: z.number().int().nonnegative(),
    }),
    sessions: z.array(
      z.object({
        sessionId: uuid,
        activityId: uuid,
        startsAt: z.iso.datetime({ offset: true }),
        endsAt: z.iso.datetime({ offset: true }),
        plannedMinutes: z.number().int().positive(),
      }),
    ),
    conflicts: z.array(
      z.object({
        code: z.enum(["insufficient_capacity", "protected_capacity"]),
        firstAffectedDeadlineAt: z.iso.datetime({ offset: true }),
        deficitMinutes: z.number().int().positive(),
        activityIds: z.array(uuid),
      }),
    ),
    unallocated: z.array(
      z.object({
        activityId: uuid,
        minutes: z.number().int().positive(),
      }),
    ),
  })
  .passthrough();

const generationEnvelopeSchema = z.object({ data: proposalSchema });
const resolutionEnvelopeSchema = z.object({
  data: z.object({
    planId: uuid,
    status: z.literal("published"),
  }),
});

export type PlanProposal = z.infer<typeof proposalSchema>;

type FunctionsClient = {
  invoke<T = unknown>(
    functionName: string,
    options?: {
      body?: string | Record<string, unknown>;
      headers?: Record<string, string>;
    },
  ): Promise<{ data: T | null; error: unknown }>;
};

export type PlannerCommandResult<T> =
  { ok: true; data: T } | { ok: false; message: string };

function errorMessage(data: unknown, fallback: string) {
  const parsed = plannerErrorSchema.safeParse(data);
  return parsed.success ? parsed.data.error.message : fallback;
}

export async function generateFirstPlan(
  functions: FunctionsClient,
  idempotencyKey: string,
): Promise<PlannerCommandResult<PlanProposal>> {
  try {
    const response = await functions.invoke("planner/generate", {
      body: {
        contractVersion: 1,
        expectedCurrentPlanId: null,
        horizonDays: 90,
        reason: "onboarding_completed",
      },
      headers: { "Idempotency-Key": idempotencyKey },
    });
    const parsed = generationEnvelopeSchema.safeParse(response.data);
    if (!response.error && parsed.success) {
      return { data: parsed.data.data, ok: true };
    }
    return {
      message: errorMessage(
        response.data,
        "Não foi possível montar seu plano agora. Tente novamente.",
      ),
      ok: false,
    };
  } catch {
    return {
      message: "Não foi possível montar seu plano agora. Tente novamente.",
      ok: false,
    };
  }
}

export async function confirmFirstPlan(
  functions: FunctionsClient,
  planId: string,
  idempotencyKey: string,
): Promise<PlannerCommandResult<{ planId: string }>> {
  try {
    const response = await functions.invoke("planner/confirm", {
      body: { contractVersion: 1, expectedCurrentPlanId: null, planId },
      headers: { "Idempotency-Key": idempotencyKey },
    });
    const parsed = resolutionEnvelopeSchema.safeParse(response.data);
    if (!response.error && parsed.success) {
      return { data: { planId: parsed.data.data.planId }, ok: true };
    }
    return {
      message: errorMessage(
        response.data,
        "Não foi possível publicar seu plano. Tente novamente.",
      ),
      ok: false,
    };
  } catch {
    return {
      message: "Não foi possível publicar seu plano. Tente novamente.",
      ok: false,
    };
  }
}
