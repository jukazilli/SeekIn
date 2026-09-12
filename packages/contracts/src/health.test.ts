import { describe, expect, it } from "vitest";

import { createHealthResponse, healthResponseSchema } from "./health";

describe("health response contract", () => {
  it("creates a versioned, correlatable response", () => {
    const response = createHealthResponse({
      correlationId: "test-correlation-id",
      service: "seekin-web",
    });

    expect(healthResponseSchema.parse(response)).toEqual({
      code: "HEALTH_OK",
      correlationId: "test-correlation-id",
      service: "seekin-web",
      status: "up",
      version: "0.1.0",
    });
  });
});
