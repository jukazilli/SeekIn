import {
  createHealthResponse,
  healthResponseSchema,
  type HealthResponse,
} from "@seekin/contracts";
import { createRequestHandler } from "react-router";

import { checkFoundationReadiness } from "../app/http/foundation-readiness";
import { applySecurityHeaders } from "../app/http/security-headers";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let response: Response;

    if (request.method === "GET" && url.pathname === "/health") {
      const correlationId =
        request.headers.get("x-correlation-id") ?? crypto.randomUUID();
      const mode = url.searchParams.get("mode") ?? "liveness";
      let body: HealthResponse;
      let status = 200;
      const headers: Record<string, string> = {
        "cache-control": "no-store",
        "x-correlation-id": correlationId,
        "x-seekin-environment": env.APP_ENV ?? "local",
        "x-seekin-health-mode": mode,
      };

      if (mode === "readiness") {
        const decision = await checkFoundationReadiness({
          authorization: request.headers.get("authorization"),
          correlationId,
          publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
          supabaseUrl: env.SUPABASE_URL,
        });
        status = decision.statusCode;
        body = healthResponseSchema.parse({
          code: decision.code,
          correlationId,
          service: "seekin-web",
          status: decision.status,
          version: env.APP_VERSION ?? "0.1.0",
        });
        headers["x-seekin-backend-status"] = decision.status;

        if (decision.backendCorrelationId) {
          headers["x-seekin-backend-correlation-id"] =
            decision.backendCorrelationId;
        }

        if (decision.backendVersion) {
          headers["x-seekin-backend-version"] = decision.backendVersion;
        }
      } else {
        body = createHealthResponse({
          correlationId,
          service: "seekin-web",
          version: env.APP_VERSION,
        });
      }

      response = Response.json(body, {
        headers,
        status,
      });
    } else {
      response = await requestHandler(request);
    }

    return applySecurityHeaders(response, {
      appEnvironment: env.APP_ENV,
      supabaseUrl: env.SUPABASE_URL,
    });
  },
} satisfies ExportedHandler<CloudflareEnvironment>;

interface CloudflareEnvironment {
  APP_ENV?: string;
  APP_VERSION?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_URL?: string;
}
