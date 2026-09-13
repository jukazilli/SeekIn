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

  it("uses the deployed application version when provided", () => {
    expect(
      createHealthResponse({
        correlationId: "preview-correlation",
        service: "seekin-web",
        version: "git-sha-preview",
      }),
    ).toMatchObject({
      correlationId: "preview-correlation",
      version: "git-sha-preview",
    });
  });

  it.each([
    ["AUTH_REQUIRED", "down"],
    ["DEPENDENCY_UNAVAILABLE", "down"],
  ] as const)("accepts the stable %s failure code", (code, status) => {
    expect(
      healthResponseSchema.parse({
        code,
        correlationId: "test-correlation-id",
        service: "seekin-backend",
        status,
        version: "0.1.0",
      }),
    ).toMatchObject({ code, status });
  });
});
