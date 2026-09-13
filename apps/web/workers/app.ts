import { createHealthResponse } from "@seekin/contracts";
import { createRequestHandler } from "react-router";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      const correlationId =
        request.headers.get("x-correlation-id") ?? crypto.randomUUID();
      const body = createHealthResponse({
        correlationId,
        service: "seekin-web",
        version: env.APP_VERSION,
      });

      return Response.json(body, {
        headers: {
          "cache-control": "no-store",
          "x-correlation-id": correlationId,
          "x-seekin-environment": env.APP_ENV ?? "local",
        },
      });
    }

    return requestHandler(request);
  },
} satisfies ExportedHandler<CloudflareEnvironment>;

interface CloudflareEnvironment {
  APP_ENV?: string;
  APP_VERSION?: string;
}
