import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../../packages/contracts/src/index.ts";
import { PLANNER_CORE_CONTRACT_VERSION } from "../../../packages/planner-core/src/index.ts";
import { generateAuthenticatedPlan } from "./generate-core.ts";
import { createPlannerInputLoader } from "./planner-input-loader.ts";
import { persistGeneratedProposal } from "./proposal-persistence.ts";

const messages = {
  AUTH_REQUIRED: "Entre na sua conta para gerar um plano.",
  SESSION_INVALID: "Sua sessão não é válida. Entre novamente.",
  UNSUPPORTED_CONTRACT_VERSION: "Esta versão do aplicativo não é compatível.",
  VALIDATION_ERROR: "Os dados do planejamento precisam ser revisados.",
  DEPENDENCY_UNAVAILABLE: "Não foi possível carregar seus dados agora.",
  INTERNAL_ERROR: "Não foi possível gerar o plano agora.",
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
  if (
    request.method !== "POST" ||
    !new URL(request.url).pathname.endsWith("/generate")
  ) {
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
  const decision = await generateAuthenticatedPlan(authorization, body, {
    async authenticate(bearerToken) {
      const token = bearerToken.slice("Bearer ".length);
      const { data, error } = await client.auth.getUser(token);
      return error ? null : (data.user?.id ?? null);
    },
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
  );
  if (!persistence.ok) {
    const stale = persistence.code === "STALE_PLAN";
    return json(
      {
        error: {
          code: stale ? "STALE_PLAN" : "INTERNAL_ERROR",
          message: stale
            ? "O plano atual mudou. Gere uma nova proposta."
            : messages.INTERNAL_ERROR,
          retryable: !stale,
        },
        meta: {
          contractVersion: PLANNER_CORE_CONTRACT_VERSION,
          correlationId,
        },
      },
      stale ? 409 : 500,
      correlationId,
    );
  }

  return json(
    {
      data: {
        ...persistence.proposal,
        ...decision.output,
      },
      meta: {
        contractVersion: PLANNER_CORE_CONTRACT_VERSION,
        correlationId,
      },
    },
    200,
    correlationId,
  );
});
