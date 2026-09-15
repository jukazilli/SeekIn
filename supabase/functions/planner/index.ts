import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../../packages/contracts/src/index.ts";
import { PLANNER_CORE_CONTRACT_VERSION } from "../../../packages/planner-core/src/index.ts";
import { generateAuthenticatedPlan } from "./generate-core.ts";
import { createIdempotencyContext } from "./idempotency.ts";
import { generateImpactProposal } from "./impact-core.ts";
import { createImpactInputLoader } from "./impact-input-loader.ts";
import { createPlannerInputLoader } from "./planner-input-loader.ts";
import { persistGeneratedProposal } from "./proposal-persistence.ts";

const messages = {
  AUTH_REQUIRED: "Entre na sua conta para gerar um plano.",
  SESSION_INVALID: "Sua sessão não é válida. Entre novamente.",
  UNSUPPORTED_CONTRACT_VERSION: "Esta versão do aplicativo não é compatível.",
  VALIDATION_ERROR: "Os dados do planejamento precisam ser revisados.",
  DEPENDENCY_UNAVAILABLE: "Não foi possível carregar seus dados agora.",
  INTERNAL_ERROR: "Não foi possível gerar o plano agora.",
  IDEMPOTENCY_REQUIRED: "Inicie uma nova solicitação de planejamento.",
  RESOURCE_NOT_FOUND: "Não foi possível localizar o item alterado.",
  STALE_PLAN: "O plano atual mudou. Gere uma nova proposta.",
} as const;

function json(body: unknown, status: number, correlationId: string) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-correlation-id": correlationId,
    },
  });
}

Deno.serve(async (request) => {
  const correlationId =
    request.headers.get("x-correlation-id") ?? crypto.randomUUID();
  const pathname = new URL(request.url).pathname;
  const isGenerate = pathname.endsWith("/generate");
  const isImpact = pathname.endsWith("/impact");
  if (request.method !== "POST" || (!isGenerate && !isImpact)) {
    return json(
      {
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: "Recurso não encontrado.",
          retryable: false,
        },
        meta: { contractVersion: 1, correlationId },
      },
      404,
      correlationId,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(
      {
        error: {
          code: "INVALID_JSON",
          message: "Envie um corpo JSON válido.",
          retryable: false,
        },
        meta: { contractVersion: 1, correlationId },
      },
      400,
      correlationId,
    );
  }

  const idempotency = await createIdempotencyContext(
    request.headers.get("idempotency-key"),
    body,
  );
  if (!idempotency) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: messages.IDEMPOTENCY_REQUIRED,
          retryable: false,
        },
        meta: { contractVersion: 1, correlationId },
      },
      422,
      correlationId,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey =
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !publishableKey) {
    return json(
      {
        error: {
          code: "DEPENDENCY_UNAVAILABLE",
          message: messages.DEPENDENCY_UNAVAILABLE,
          retryable: true,
        },
        meta: { contractVersion: 1, correlationId },
      },
      503,
      correlationId,
    );
  }

  const authorization = request.headers.get("authorization");
  const client = createClient<Database>(supabaseUrl, publishableKey, {
    global: authorization
      ? { headers: { Authorization: authorization } }
      : undefined,
    auth: { persistSession: false },
  });
  const authenticate = async (bearerToken: string) => {
    const token = bearerToken.slice("Bearer ".length);
    const { data, error } = await client.auth.getUser(token);
    return error ? null : (data.user?.id ?? null);
  };
  const decision = isImpact
    ? await generateImpactProposal(authorization, body, {
        authenticate,
        loader: createImpactInputLoader(client),
      })
    : await generateAuthenticatedPlan(authorization, body, {
        authenticate,
        loader: createPlannerInputLoader(client),
      });

  if (!decision.ok) {
    return json(
      {
        error: {
          code: decision.code,
          message: messages[decision.code],
          retryable:
            decision.code === "DEPENDENCY_UNAVAILABLE" ||
            decision.code === "INTERNAL_ERROR",
        },
        meta: {
          contractVersion: PLANNER_CORE_CONTRACT_VERSION,
          correlationId,
        },
      },
      decision.statusCode,
      correlationId,
    );
  }

  const persistence = await persistGeneratedProposal(
    client,
    decision,
    correlationId,
    idempotency,
    isImpact ? "impact" : "generate",
  );
  if (!persistence.ok) {
    const stale = persistence.code === "STALE_PLAN";
    const idempotencyConflict = persistence.code === "IDEMPOTENCY_CONFLICT";
    return json(
      {
        error: {
          code: stale
            ? "STALE_PLAN"
            : idempotencyConflict
              ? "IDEMPOTENCY_CONFLICT"
              : "INTERNAL_ERROR",
          message: stale
            ? "O plano atual mudou. Gere uma nova proposta."
            : idempotencyConflict
              ? "Esta solicitação já foi usada com outros dados."
              : messages.INTERNAL_ERROR,
          retryable: !stale && !idempotencyConflict,
        },
        meta: {
          contractVersion: PLANNER_CORE_CONTRACT_VERSION,
          correlationId,
        },
      },
      stale || idempotencyConflict ? 409 : 500,
      correlationId,
    );
  }

  return json(
    {
      data: {
        ...persistence.proposal,
        ...persistence.output,
      },
      meta: {
        contractVersion: PLANNER_CORE_CONTRACT_VERSION,
        correlationId,
        replayed: persistence.replayed,
      },
    },
    200,
    correlationId,
  );
});
