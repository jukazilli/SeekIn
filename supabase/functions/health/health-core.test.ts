import { describe, expect, it, vi } from "vitest";

import { evaluateHealth } from "./health-core";

const correlationId = "g1-health-proof";

describe("health decision", () => {
  it("keeps liveness public without consulting the database", async () => {
    const checkDatabase = vi.fn<() => Promise<boolean>>();

    await expect(
      evaluateHealth({
        authorization: null,
        checkDatabase,
        correlationId,
        mode: "liveness",
      }),
    ).resolves.toEqual({ code: "HEALTH_OK", correlationId, statusCode: 200 });
    expect(checkDatabase).not.toHaveBeenCalled();
  });

  it("requires a bearer token for readiness", async () => {
    await expect(
      evaluateHealth({
        authorization: null,
        checkDatabase: vi.fn(),
        correlationId,
        mode: "readiness",
      }),
    ).resolves.toEqual({
      code: "AUTH_REQUIRED",
      correlationId,
      statusCode: 401,
    });
  });

  it("reports a healthy database and preserves correlation", async () => {
    await expect(
      evaluateHealth({
        authorization: "Bearer synthetic-token",
        checkDatabase: async () => true,
        correlationId,
        mode: "readiness",
      }),
    ).resolves.toEqual({ code: "HEALTH_OK", correlationId, statusCode: 200 });
  });

  it.each([
    async () => false,
    async () => Promise.reject(new Error("offline")),
  ])(
    "maps an unavailable database to a stable response",
    async (checkDatabase) => {
      await expect(
        evaluateHealth({
          authorization: "Bearer synthetic-token",
          checkDatabase,
          correlationId,
          mode: "readiness",
        }),
      ).resolves.toEqual({
        code: "DEPENDENCY_UNAVAILABLE",
        correlationId,
        statusCode: 503,
      });
    },
  );
});
