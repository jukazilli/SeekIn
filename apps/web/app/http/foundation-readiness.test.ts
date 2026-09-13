import { describe, expect, it, vi } from "vitest";

import { checkFoundationReadiness } from "./foundation-readiness";

const correlationId = "skn-027-correlation";
const publishableKey = "sb_publishable_test";
const supabaseUrl = "https://project-ref.supabase.co";

function backendResponse(
  overrides: Partial<{
    code: "AUTH_REQUIRED" | "DEPENDENCY_UNAVAILABLE" | "HEALTH_OK";
    correlationId: string;
    service: "seekin-backend" | "seekin-web";
    status: "down" | "up";
    version: string;
  }> = {},
  status = 200,
) {
  return Response.json(
    {
      code: "HEALTH_OK",
      correlationId,
      service: "seekin-backend",
      status: "up",
      version: "0.1.0",
      ...overrides,
    },
    { status },
  );
}

describe("foundation readiness bridge", () => {
  it("requires a bearer token before calling the backend", async () => {
    const fetcher = vi.fn<typeof fetch>();

    await expect(
      checkFoundationReadiness({
        authorization: null,
        correlationId,
        fetcher,
        publishableKey,
        supabaseUrl,
      }),
    ).resolves.toEqual({
      code: "AUTH_REQUIRED",
      status: "down",
      statusCode: 401,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("calls the beta Edge Function with the same correlation and no key in the URL", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(backendResponse());

    await expect(
      checkFoundationReadiness({
        authorization: "Bearer synthetic-user-token",
        correlationId,
        fetcher,
        publishableKey,
        supabaseUrl,
      }),
    ).resolves.toEqual({
      backendCorrelationId: correlationId,
      backendVersion: "0.1.0",
      code: "HEALTH_OK",
      status: "up",
      statusCode: 200,
    });

    expect(fetcher).toHaveBeenCalledOnce();
    const [requestUrl, requestInit] = fetcher.mock.calls[0]!;
    expect(String(requestUrl)).toBe(
      "https://project-ref.supabase.co/functions/v1/health?mode=readiness",
    );
    expect(String(requestUrl)).not.toContain(publishableKey);
    expect(requestInit?.headers).toEqual({
      apikey: publishableKey,
      authorization: "Bearer synthetic-user-token",
      "x-correlation-id": correlationId,
    });
  });

  it("rejects a backend response that breaks correlation", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(backendResponse({ correlationId: "unexpected" }));

    await expect(
      checkFoundationReadiness({
        authorization: "Bearer synthetic-user-token",
        correlationId,
        fetcher,
        publishableKey,
        supabaseUrl,
      }),
    ).resolves.toEqual({
      code: "DEPENDENCY_UNAVAILABLE",
      status: "down",
      statusCode: 503,
    });
  });

  it("preserves the backend authorization failure without exposing details", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        backendResponse({ code: "AUTH_REQUIRED", status: "down" }, 401),
      );

    await expect(
      checkFoundationReadiness({
        authorization: "Bearer expired-token",
        correlationId,
        fetcher,
        publishableKey,
        supabaseUrl,
      }),
    ).resolves.toEqual({
      backendCorrelationId: correlationId,
      backendVersion: "0.1.0",
      code: "AUTH_REQUIRED",
      status: "down",
      statusCode: 401,
    });
  });

  it.each([
    ["missing environment", undefined, publishableKey],
    ["missing key", supabaseUrl, undefined],
  ])("maps %s to an unavailable dependency", async (_label, url, key) => {
    await expect(
      checkFoundationReadiness({
        authorization: "Bearer synthetic-user-token",
        correlationId,
        publishableKey: key,
        supabaseUrl: url,
      }),
    ).resolves.toEqual({
      code: "DEPENDENCY_UNAVAILABLE",
      status: "down",
      statusCode: 503,
    });
  });
});
