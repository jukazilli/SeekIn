export interface LoginInput {
  captchaToken: string;
  email: string;
  password: string;
}

export type LoginFieldErrors = Partial<Record<"email" | "password", string>>;

export type LoginValidation =
  { errors: LoginFieldErrors; ok: false } | { input: LoginInput; ok: true };

interface AuthErrorShape {
  code?: string;
  status?: number;
}

interface PasswordAuth {
  signInWithPassword(input: {
    email: string;
    options: { captchaToken: string };
    password: string;
  }): Promise<{
    data: { session: unknown | null };
    error: AuthErrorShape | null;
  }>;
}

interface VerifiedUserAuth {
  getUser(): Promise<{
    data: { user: { id: string } | null };
    error: AuthErrorShape | null;
  }>;
}

export type LoginResult =
  | "authenticated"
  | "challenge_failed"
  | "invalid"
  | "rate_limited"
  | "unavailable";

export type VerifiedSession =
  | { kind: "authenticated"; userId: string }
  | { kind: "anonymous" }
  | { kind: "unavailable" };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const blockedReturnPaths = new Set([
  "/",
  "/auth/confirmar",
  "/conta-confirmada",
  "/criar-conta",
  "/entrar",
]);

export function validateLogin(formData: FormData): LoginValidation {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const captchaToken = String(
    formData.get("cf-turnstile-response") ?? "",
  ).trim();
  const errors: LoginFieldErrors = {};

  if (email.length > 254 || !emailPattern.test(email)) {
    errors.email = "Informe um e-mail válido.";
  }
  if (password.length === 0 || password.length > 128) {
    errors.password = "Informe sua senha.";
  }

  if (Object.keys(errors).length > 0) return { errors, ok: false };
  return { input: { captchaToken, email, password }, ok: true };
}

export function safeReturnPath(value: string | null, fallback = "/app") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://seekin.invalid");
    if (parsed.origin !== "https://seekin.invalid") return fallback;
    if (blockedReturnPaths.has(parsed.pathname)) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export async function requestLogin(
  auth: PasswordAuth,
  input: LoginInput,
): Promise<LoginResult> {
  try {
    const { data, error } = await auth.signInWithPassword({
      email: input.email,
      password: input.password,
      options: { captchaToken: input.captchaToken },
    });

    if (!error && data.session) return "authenticated";
    if (error?.code === "captcha_failed") return "challenge_failed";
    if (error?.status === 429) return "rate_limited";
    if (error?.status && error.status >= 500) return "unavailable";
    return "invalid";
  } catch {
    return "unavailable";
  }
}

export async function readVerifiedSession(
  auth: VerifiedUserAuth,
): Promise<VerifiedSession> {
  try {
    const { data, error } = await auth.getUser();
    if (!error && data.user) {
      return { kind: "authenticated", userId: data.user.id };
    }
    if (error?.status && error.status >= 500) return { kind: "unavailable" };
    return { kind: "anonymous" };
  } catch {
    return { kind: "unavailable" };
  }
}
