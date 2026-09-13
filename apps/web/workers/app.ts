import { createHealthResponse } from "@seekin/contracts";
import { createRequestHandler } from "react-router";

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
      const body = createHealthResponse({
        correlationId,
        service: "seekin-web",
        version: env.APP_VERSION,
      });

      response = Response.json(body, {
        headers: {
          "cache-control": "no-store",
          "x-correlation-id": correlationId,
          "x-seekin-environment": env.APP_ENV ?? "local",
        },
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
