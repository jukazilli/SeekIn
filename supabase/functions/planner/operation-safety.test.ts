import { describe, expect, it, vi } from "vitest";

import {
  logPlannerFailure,
  PlannerTimeoutError,
  runWithPlannerTimeout,
} from "./operation-safety";

describe("planner operation safety", () => {
  it("rejects an asynchronous operation at the configured deadline", async () => {
    vi.useFakeTimers();
    try {
      const pending = runWithPlannerTimeout(
        () => new Promise<string>(() => undefined),
        25,
      );
      const assertion =
        expect(pending).rejects.toBeInstanceOf(PlannerTimeoutError);
      await vi.advanceTimersByTimeAsync(25);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("also rejects synchronous work observed after its deadline", async () => {
    const now = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(25);
    await expect(
      runWithPlannerTimeout(async () => "late", 25, now),
    ).rejects.toBeInstanceOf(PlannerTimeoutError);
  });

  it("logs only allowlisted operational metadata", () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    logPlannerFailure({
      code: "PLANNER_TIMEOUT",
      correlationId: "correlation-safe",
      operation: "generate",
      stage: "decision",
    });

    const event = JSON.parse(String(error.mock.calls[0]?.[0]));
    expect(event).toMatchObject({
      event: "planner.operation_failed",
      code: "PLANNER_TIMEOUT",
      correlationId: "correlation-safe",
      operation: "generate",
      stage: "decision",
    });
    expect(event).not.toHaveProperty("input");
    expect(event).not.toHaveProperty("userId");
    error.mockRestore();
  });
});
