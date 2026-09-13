import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { evaluateHealth, type HealthCode } from "./health-core.ts";

const responseSchema = z.object({
  code: z.enum(["HEALTH_OK", "AUTH_REQUIRED", "DEPENDENCY_UNAVAILABLE"]),
  correlationId: z.string().min(1),
  service: z.literal("seekin-backend"),
  status: z.enum(["up", "down"]),
  version: z.string().min(1),
});

function response(statusCode: number, code: HealthCode, correlationId: string) {
  const body = responseSchema.parse({
    code,
    correlationId,
    service: "seekin-backend",
    status: code === "HEALTH_OK" ? "up" : "down",
    version: Deno.env.get("APP_VERSION") ?? "0.1.0",
  });

  return Response.json(body, {
    status: statusCode,
    headers: {
      "cache-control": "no-store",
      "x-correlation-id": correlationId,
    },
  });
}

Deno.serve(async (request) => {
  const correlationId =
    request.headers.get("x-correlation-id") ?? crypto.randomUUID();
  const mode = new URL(request.url).searchParams.get("mode") ?? "liveness";
  const authorization = request.headers.get("authorization");
  const decision = await evaluateHealth({
    authorization,
    correlationId,
    mode,
    async checkDatabase(bearerToken) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const publishableKey =
        Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
        Deno.env.get("SUPABASE_ANON_KEY");

      if (!supabaseUrl || !publishableKey) return false;

      const supabase = createClient(supabaseUrl, publishableKey, {
        global: { headers: { Authorization: bearerToken } },
        auth: { persistSession: false },
      });
      const { data, error } = await supabase.rpc("foundation_health");
      return !error && data === 1;
    },
  });

  return response(decision.statusCode, decision.code, decision.correlationId);
});
