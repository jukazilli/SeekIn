import { describe, expect, it, vi } from "vitest";

import { createAuthGateway } from "./auth-gateway";

function operations(status?: number) {
  return {
    resend: vi.fn().mockResolvedValue({
      error: status ? { code: "test_error", status } : null,
    }),
    signUp: vi.fn().mockResolvedValue({
      error: status ? { code: "test_error", status } : null,
    }),
    verifyOtp: vi.fn().mockResolvedValue({
      error: status ? { code: "test_error", status } : null,
    }),
  };
}

describe("Supabase Auth gateway", () => {
  it("keeps successful and client-rejected registrations indistinguishable", async () => {
    const accepted = createAuthGateway(operations());
    const existingAddress = createAuthGateway(operations(422));

    const input = {
      captchaToken: "turnstile-token",
      email: "student@example.test",
      emailRedirectTo: "https://example.test/auth/confirmar",
      password: "study123",
    };

    await expect(accepted.register(input)).resolves.toBe("accepted");
    await expect(existingAddress.register(input)).resolves.toBe("accepted");
  });

  it("reports rate limits without exposing account state", async () => {
    const gateway = createAuthGateway(operations(429));

    await expect(
      gateway.resendConfirmation({
        captchaToken: "turnstile-token",
        email: "student@example.test",
        emailRedirectTo: "https://example.test/auth/confirmar",
      }),
    ).resolves.toBe("rate_limited");
  });

  it("reports an invalid anti-abuse challenge without exposing account state", async () => {
    const protectedOperations = operations();
    protectedOperations.signUp.mockResolvedValue({
      error: { code: "captcha_failed", status: 400 },
    });

    await expect(
      createAuthGateway(protectedOperations).register({
        captchaToken: "expired-token",
        email: "student@example.test",
        emailRedirectTo: "https://example.test/auth/confirmar",
        password: "study123",
      }),
    ).resolves.toBe("challenge_failed");
  });

  it("separates invalid confirmation links from service failures", async () => {
    await expect(
      createAuthGateway(operations(400)).confirmEmail("invalid-token"),
    ).resolves.toBe("invalid");
    await expect(
      createAuthGateway(operations(503)).confirmEmail("valid-token"),
    ).resolves.toBe("unavailable");
  });

  it("treats transport failures as unavailable without leaking details", async () => {
    const failingOperations = operations();
    failingOperations.signUp.mockRejectedValueOnce(new Error("network down"));
    const gateway = createAuthGateway(failingOperations);

    await expect(
      gateway.register({
        captchaToken: "turnstile-token",
        email: "student@example.test",
        emailRedirectTo: "https://example.test/auth/confirmar",
        password: "study123",
      }),
    ).resolves.toBe("unavailable");
  });
});
