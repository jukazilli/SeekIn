import { describe, expect, it, vi } from "vitest";

import {
  readVerifiedSession,
  requestLogin,
  safeReturnPath,
  validateLogin,
} from "./session-flow";

describe("session flow", () => {
  it("accepts only bounded credentials", () => {
    const valid = new FormData();
    valid.set("email", " Student@Example.Test ");
    valid.set("password", "study123");
    valid.set("cf-turnstile-response", "challenge");

    expect(validateLogin(valid)).toEqual({
      input: {
        captchaToken: "challenge",
        email: "student@example.test",
        password: "study123",
      },
      ok: true,
    });

    const invalid = new FormData();
    invalid.set("email", "invalid");
    invalid.set("password", "");
    expect(validateLogin(invalid)).toEqual({
      errors: {
        email: "Informe um e-mail válido.",
        password: "Informe sua senha.",
      },
      ok: false,
    });
  });

  it("keeps return paths on the same origin and outside auth loops", () => {
    expect(safeReturnPath("/app?view=today")).toBe("/app?view=today");
    expect(safeReturnPath("https://evil.example/private")).toBe("/app");
    expect(safeReturnPath("//evil.example/private")).toBe("/app");
    expect(safeReturnPath("/entrar?next=/app")).toBe("/app");
  });

  it("classifies login failures without exposing account state", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { session: null },
      error: { code: "invalid_credentials", status: 400 },
    });

    await expect(
      requestLogin(
        { signInWithPassword },
        {
          captchaToken: "challenge",
          email: "student@example.test",
          password: "study123",
        },
      ),
    ).resolves.toBe("invalid");
  });

  it("requires a user verified by the Auth server", async () => {
    await expect(
      readVerifiedSession({
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      }),
    ).resolves.toEqual({ kind: "authenticated", userId: "user-1" });

    await expect(
      readVerifiedSession({
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { code: "session_not_found", status: 403 },
        }),
      }),
    ).resolves.toEqual({ kind: "anonymous" });
  });
});
