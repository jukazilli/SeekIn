import { describe, expect, it } from "vitest";
import { RouterContextProvider } from "react-router";

import { cloudflareEnvironmentContext } from "../http/runtime-context";
import {
  confirmationUrl,
  isSameOriginSubmission,
  readAuthFormData,
  turnstileSiteKey,
} from "./runtime-auth";

function requestContext(environment: Partial<CloudflareBindings>) {
  const context = new RouterContextProvider();
  context.set(cloudflareEnvironmentContext, environment);
  return context;
}

describe("server-side auth runtime", () => {
  it("pins confirmation links to the configured application origin", () => {
    const context = requestContext({
      APP_ENV: "beta",
      APP_ORIGIN: "https://seekin.example.test",
    });
    const request = new Request("https://untrusted.example/auth", {
      headers: { origin: "https://untrusted.example" },
    });

    expect(confirmationUrl(request, context)).toBe(
      "https://seekin.example.test/auth/confirmar",
    );
  });

  it("fails closed when beta has no configured application origin", () => {
    const context = requestContext({ APP_ENV: "beta" });
    expect(
      confirmationUrl(new Request("https://seekin.example.test"), context),
    ).toBeNull();
  });

  it("accepts only same-origin browser submissions", () => {
    expect(
      isSameOriginSubmission(
        new Request("https://seekin.example.test/criar-conta", {
          headers: { origin: "https://seekin.example.test" },
          method: "POST",
        }),
      ),
    ).toBe(true);
    expect(
      isSameOriginSubmission(
        new Request("https://seekin.example.test/criar-conta", {
          headers: { origin: "https://attacker.example" },
          method: "POST",
        }),
      ),
    ).toBe(false);
  });

  it("accepts only bounded URL-encoded auth forms", async () => {
    const validRequest = new Request("https://seekin.example.test", {
      body: new URLSearchParams({ email: "student@example.test" }),
      method: "POST",
    });
    const formData = await readAuthFormData(validRequest);
    expect(formData?.get("email")).toBe("student@example.test");

    await expect(
      readAuthFormData(
        new Request("https://seekin.example.test", {
          body: JSON.stringify({ email: "student@example.test" }),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
      ),
    ).resolves.toBeNull();

    await expect(
      readAuthFormData(
        new Request("https://seekin.example.test", {
          body: new URLSearchParams({ value: "x".repeat(8 * 1024) }),
          method: "POST",
        }),
      ),
    ).resolves.toBeNull();
  });

  it("uses the official always-pass Turnstile key as the local fallback", () => {
    expect(turnstileSiteKey(requestContext({ APP_ENV: "local" }))).toBe(
      "1x00000000000000000000AA",
    );
    expect(turnstileSiteKey(requestContext({ APP_ENV: "preview" }))).toBeNull();
  });
});
