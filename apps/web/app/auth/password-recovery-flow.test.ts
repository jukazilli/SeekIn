import { describe, expect, it, vi } from "vitest";
import {
  requestPasswordRecovery,
  updateRecoveredPassword,
  validateNewPassword,
  validateRecoveryRequest,
} from "./password-recovery-flow";

describe("SKN-043 password recovery rules", () => {
  it("validates and normalizes the request", () => {
    const form = new FormData();
    form.set("email", " Student@Example.test ");
    form.set("cf-turnstile-response", "challenge");
    expect(validateRecoveryRequest(form)).toEqual({
      captchaToken: "challenge",
      email: "student@example.test",
      ok: true,
    });
  });
  it("keeps account existence neutral", async () => {
    const existing = {
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    };
    const missing = {
      resetPasswordForEmail: vi
        .fn()
        .mockResolvedValue({ error: { code: "user_not_found", status: 404 } }),
    };
    await expect(
      requestPasswordRecovery(
        existing,
        "a@example.test",
        "ok",
        "https://app/reset",
      ),
    ).resolves.toBe("sent");
    await expect(
      requestPasswordRecovery(
        missing,
        "b@example.test",
        "ok",
        "https://app/reset",
      ),
    ).resolves.toBe("sent");
  });
  it("requires the account password contract", () => {
    const form = new FormData();
    form.set("password", "short");
    form.set("confirmPassword", "different");
    expect(validateNewPassword(form)).toEqual({
      errors: {
        confirmPassword: "As senhas não coincidem.",
        password: "Use de 8 a 128 caracteres, com letras e números.",
      },
      ok: false,
    });
  });
  it("updates the password and closes the recovery session", async () => {
    const auth = {
      signOut: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi
        .fn()
        .mockResolvedValue({ data: { user: {} }, error: null }),
      verifyOtp: vi
        .fn()
        .mockResolvedValue({ data: { session: {} }, error: null }),
    };
    await expect(
      updateRecoveredPassword(auth, "token", "newpass123"),
    ).resolves.toBe("updated");
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "newpass123" });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
