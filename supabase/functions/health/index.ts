import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const responseSchema = z.object({
  code: z.enum(["HEALTH_OK", "AUTH_REQUIRED", "DEPENDENCY_UNAVAILABLE"]),
  correlationId: z.string().min(1),
  service: z.literal("seekin-backend"),
  status: z.enum(["up", "down"]),
  version: z.string().min(1),
});

type HealthCode = z.infer<typeof responseSchema>["code"];

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

  if (mode === "liveness") {
    return response(200, "HEALTH_OK", correlationId);
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return response(401, "AUTH_REQUIRED", correlationId);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey =
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !publishableKey) {
    return response(503, "DEPENDENCY_UNAVAILABLE", correlationId);
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.rpc("foundation_health");

  if (error || data !== 1) {
    return response(503, "DEPENDENCY_UNAVAILABLE", correlationId);
  }

  return response(200, "HEALTH_OK", correlationId);
});
