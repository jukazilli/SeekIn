import { healthResponseSchema, type HealthResponse } from "@seekin/contracts";

export interface FoundationReadinessDecision {
  backendCorrelationId?: string;
  backendVersion?: string;
  code: HealthResponse["code"];
  status: HealthResponse["status"];
  statusCode: 200 | 401 | 503;
}

interface CheckFoundationReadinessInput {
  authorization: string | null;
  correlationId: string;
  fetcher?: typeof fetch;
  publishableKey?: string;
  supabaseUrl?: string;
}

const dependencyUnavailable = (): FoundationReadinessDecision => ({
  code: "DEPENDENCY_UNAVAILABLE",
  status: "down",
  statusCode: 503,
});

export async function checkFoundationReadiness({
  authorization,
  correlationId,
  fetcher = fetch,
  publishableKey,
  supabaseUrl,
}: CheckFoundationReadinessInput): Promise<FoundationReadinessDecision> {
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!bearerToken) {
    return { code: "AUTH_REQUIRED", status: "down", statusCode: 401 };
  }

  if (!publishableKey?.trim() || !supabaseUrl?.trim()) {
    return dependencyUnavailable();
  }

  let endpoint: URL;

  try {
    endpoint = new URL("/functions/v1/health", supabaseUrl);
    endpoint.searchParams.set("mode", "readiness");
  } catch {
    return dependencyUnavailable();
  }

  try {
    const response = await fetcher(endpoint, {
      headers: {
        apikey: publishableKey,
        authorization: `Bearer ${bearerToken}`,
        "x-correlation-id": correlationId,
      },
      method: "GET",
      signal: AbortSignal.timeout(5_000),
    });
    const parsed = healthResponseSchema.safeParse(await response.json());

    if (
      !parsed.success ||
      parsed.data.service !== "seekin-backend" ||
      parsed.data.correlationId !== correlationId
    ) {
      return dependencyUnavailable();
    }

    if (
      response.status === 401 &&
      parsed.data.code === "AUTH_REQUIRED" &&
      parsed.data.status === "down"
    ) {
      return {
        backendCorrelationId: parsed.data.correlationId,
        backendVersion: parsed.data.version,
        code: "AUTH_REQUIRED",
        status: "down",
        statusCode: 401,
      };
    }

    if (
      !response.ok ||
      parsed.data.code !== "HEALTH_OK" ||
      parsed.data.status !== "up"
    ) {
      return dependencyUnavailable();
    }

    return {
      backendCorrelationId: parsed.data.correlationId,
      backendVersion: parsed.data.version,
      code: "HEALTH_OK",
      status: "up",
      statusCode: 200,
    };
  } catch {
    return dependencyUnavailable();
  }
}
