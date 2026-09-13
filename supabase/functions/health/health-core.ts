export type HealthCode =
  "HEALTH_OK" | "AUTH_REQUIRED" | "DEPENDENCY_UNAVAILABLE";

export interface HealthDecision {
  code: HealthCode;
  correlationId: string;
  statusCode: 200 | 401 | 503;
}

interface EvaluateHealthInput {
  authorization: string | null;
  checkDatabase: (authorization: string) => Promise<boolean>;
  correlationId: string;
  mode: string;
}

export async function evaluateHealth({
  authorization,
  checkDatabase,
  correlationId,
  mode,
}: EvaluateHealthInput): Promise<HealthDecision> {
  if (mode === "liveness") {
    return { code: "HEALTH_OK", correlationId, statusCode: 200 };
  }

  if (!authorization?.startsWith("Bearer ")) {
    return { code: "AUTH_REQUIRED", correlationId, statusCode: 401 };
  }

  try {
    const databaseAvailable = await checkDatabase(authorization);
    return databaseAvailable
      ? { code: "HEALTH_OK", correlationId, statusCode: 200 }
      : { code: "DEPENDENCY_UNAVAILABLE", correlationId, statusCode: 503 };
  } catch {
    return { code: "DEPENDENCY_UNAVAILABLE", correlationId, statusCode: 503 };
  }
}
