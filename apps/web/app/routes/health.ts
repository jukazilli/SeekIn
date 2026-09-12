import { createHealthResponse } from "@seekin/contracts";
import type { LoaderFunctionArgs } from "react-router";

export function loader({ request }: LoaderFunctionArgs) {
  const correlationId =
    request.headers.get("x-correlation-id") ?? crypto.randomUUID();
  const body = createHealthResponse({
    correlationId,
    service: "seekin-web",
  });

  return Response.json(body, {
    headers: {
      "cache-control": "no-store",
      "x-correlation-id": correlationId,
    },
  });
}
