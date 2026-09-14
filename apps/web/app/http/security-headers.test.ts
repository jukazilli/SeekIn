import { describe, expect, it } from "vitest";

import { applySecurityHeaders } from "./security-headers";

describe("security headers", () => {
  it("restricts the beta response to its configured Supabase project", () => {
    const response = applySecurityHeaders(new Response("ok"), {
      appEnvironment: "beta",
      supabaseUrl: "https://wgxolsfirwqbkeluxaak.supabase.co",
    });

    expect(response.headers.get("content-security-policy")).toContain(
      "connect-src 'self' https://challenges.cloudflare.com https://wgxolsfirwqbkeluxaak.supabase.co wss://wgxolsfirwqbkeluxaak.supabase.co",
    );
    expect(response.headers.get("content-security-policy")).not.toContain("*");
    expect(response.headers.get("content-security-policy")).toContain(
      "font-src 'self' data:",
    );
    expect(response.headers.get("content-security-policy")).toContain(
      "frame-src https://challenges.cloudflare.com",
    );
    expect(response.headers.get("content-security-policy")).toContain(
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    );
    expect(response.headers.get("strict-transport-security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });

  it("does not advertise HSTS in the local environment", () => {
    const response = applySecurityHeaders(new Response(null), {
      appEnvironment: "local",
    });

    expect(response.headers.has("strict-transport-security")).toBe(false);
    expect(response.headers.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  it("preserves a stricter route-level referrer policy", () => {
    const response = new Response(null, {
      headers: { "referrer-policy": "no-referrer" },
    });

    applySecurityHeaders(response);

    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
});
