export const PLANNER_OPERATION_TIMEOUT_MS = 5_000;

export class PlannerTimeoutError extends Error {
  constructor() {
    super("Planner operation timed out");
    this.name = "PlannerTimeoutError";
  }
}

export async function runWithPlannerTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs = PLANNER_OPERATION_TIMEOUT_MS,
  now: () => number = Date.now,
): Promise<T> {
  const startedAt = now();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new PlannerTimeoutError()),
          timeoutMs,
        );
      }),
    ]);
    if (now() - startedAt >= timeoutMs) throw new PlannerTimeoutError();
    return result;
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

type PlannerFailureCode =
  "DEPENDENCY_UNAVAILABLE" | "INTERNAL_ERROR" | "PLANNER_TIMEOUT";

export function logPlannerFailure(event: {
  code: PlannerFailureCode;
  correlationId: string;
  operation: "generate" | "impact" | "resolve";
  stage: "decision" | "persistence";
}) {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      event: "planner.operation_failed",
      module: "planner",
      contractVersion: 1,
      ...event,
    }),
  );
}
