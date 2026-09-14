import { describe, expect, it, vi } from "vitest";

import type { AuthGateway } from "@seekin/data-access";

import {
  confirmEmail,
  maskEmail,
  requestConfirmationResend,
  requestRegistration,
  validateSignUp,
} from "./account-flow";

function signUpForm(values: Partial<Record<string, string>> = {}) {
  const form = new FormData();
  form.set("email", values.email ?? "student@example.test");
  form.set("password", values.password ?? "study123");
  form.set("confirmPassword", values.confirmPassword ?? "study123");
  form.set("cf-turnstile-response", "turnstile-token");
  return form;
}

function gateway(): AuthGateway {
  return {
    confirmEmail: vi.fn().mockResolvedValue("confirmed"),
    register: vi.fn().mockResolvedValue("accepted"),
    resendConfirmation: vi.fn().mockResolvedValue("accepted"),
  };
}

describe("account creation flow", () => {
  it("normalizes valid input without weakening the password contract", () => {
    expect(
      validateSignUp(signUpForm({ email: "  Student@Example.Test " })),
    ).toEqual({
      input: {
        captchaToken: "turnstile-token",
        confirmPassword: "study123",
        email: "student@example.test",
        password: "study123",
      },
      ok: true,
    });
  });

  it("returns field-specific errors for invalid input", () => {
    expect(
      validateSignUp(
        signUpForm({
          confirmPassword: "different123",
          email: "invalid",
          password: "short",
        }),
      ),
    ).toEqual({
      errors: {
        confirmPassword: "As senhas não coincidem.",
        email: "Informe um e-mail válido.",
        password: "Use de 8 a 128 caracteres, com letras e números.",
      },
      ok: false,
    });
  });

  it("masks the address shown after a neutral submission", () => {
    expect(maskEmail("student@example.test")).toBe("s***@example.test");
  });

  it("keeps a missing challenge separate from field validation", () => {
    const form = signUpForm();
    form.delete("cf-turnstile-response");

    expect(validateSignUp(form)).toEqual({
      input: {
        captchaToken: "",
        confirmPassword: "study123",
        email: "student@example.test",
        password: "study123",
      },
      ok: true,
    });
  });

  it("delegates register, resend and confirmation to the Auth boundary", async () => {
    const authGateway = gateway();
    const input = {
      captchaToken: "turnstile-token",
      confirmPassword: "study123",
      email: "student@example.test",
      password: "study123",
    };
    const redirect = "https://example.test/auth/confirmar";

    await expect(
      requestRegistration(authGateway, input, redirect),
    ).resolves.toBe("accepted");
    await expect(
      requestConfirmationResend(
        authGateway,
        input.captchaToken,
        input.email,
        redirect,
      ),
    ).resolves.toBe("accepted");
    await expect(confirmEmail(authGateway, "token-hash")).resolves.toBe(
      "confirmed",
    );
  });
});
