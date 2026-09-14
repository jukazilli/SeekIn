import { validateCaptchaToken, validateEmail } from "./account-flow";

interface AuthErrorShape {
  code?: string;
  status?: number;
}
interface RecoveryAuth {
  resetPasswordForEmail(
    email: string,
    options: { captchaToken: string; redirectTo: string },
  ): Promise<{ error: AuthErrorShape | null }>;
}
interface PasswordUpdateAuth {
  signOut(options: {
    scope: "local";
  }): Promise<{ error: AuthErrorShape | null }>;
  updateUser(input: {
    password: string;
  }): Promise<{ data: { user: unknown | null }; error: AuthErrorShape | null }>;
  verifyOtp(input: { token_hash: string; type: "recovery" }): Promise<{
    data: { session: unknown | null };
    error: AuthErrorShape | null;
  }>;
}

export type RecoveryRequestResult = "challenge_failed" | "sent" | "unavailable";
export type PasswordUpdateResult = "invalid" | "updated" | "unavailable";

export function validateRecoveryRequest(formData: FormData) {
  const email = validateEmail(formData.get("email"));
  const captchaToken = validateCaptchaToken(
    formData.get("cf-turnstile-response"),
  );
  if (!email) return { error: "Informe um e-mail válido.", ok: false } as const;
  return { captchaToken, email, ok: true } as const;
}

export function validateNewPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmPassword") ?? "");
  const errors: Partial<Record<"confirmPassword" | "password", string>> = {};
  if (
    password.length < 8 ||
    password.length > 128 ||
    !/[A-Za-z]/.test(password) ||
    !/\d/.test(password)
  ) {
    errors.password = "Use de 8 a 128 caracteres, com letras e números.";
  }
  if (confirmation !== password)
    errors.confirmPassword = "As senhas não coincidem.";
  return Object.keys(errors).length > 0
    ? ({ errors, ok: false } as const)
    : ({ ok: true, password } as const);
}

export async function requestPasswordRecovery(
  auth: RecoveryAuth,
  email: string,
  captchaToken: string,
  redirectTo: string,
): Promise<RecoveryRequestResult> {
  try {
    const { error } = await auth.resetPasswordForEmail(email, {
      captchaToken,
      redirectTo,
    });
    if (!error) return "sent";
    if (error.code === "captcha_failed") return "challenge_failed";
    if (error.status && error.status >= 500) return "unavailable";
    return "sent";
  } catch {
    return "unavailable";
  }
}

export async function updateRecoveredPassword(
  auth: PasswordUpdateAuth,
  tokenHash: string,
  password: string,
): Promise<PasswordUpdateResult> {
  try {
    const verified = await auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    if (verified.error || !verified.data.session) return "invalid";
    const updated = await auth.updateUser({ password });
    if (updated.error || !updated.data.user)
      return updated.error?.status && updated.error.status >= 500
        ? "unavailable"
        : "invalid";
    await auth.signOut({ scope: "local" });
    return "updated";
  } catch {
    return "unavailable";
  }
}
