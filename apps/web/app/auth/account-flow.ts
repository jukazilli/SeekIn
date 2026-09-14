import type {
  AuthGateway,
  AuthRequestResult,
  EmailConfirmationResult,
} from "@seekin/data-access";

export interface SignUpInput {
  captchaToken: string;
  confirmPassword: string;
  email: string;
  password: string;
}

export type SignUpFieldErrors = Partial<Record<keyof SignUpInput, string>>;

export type SignUpValidation =
  { errors: SignUpFieldErrors; ok: false } | { input: SignUpInput; ok: true };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function validateEmail(value: FormDataEntryValue | null) {
  const email = normalizeEmail(value);
  return email.length <= 254 && emailPattern.test(email) ? email : null;
}

export function validateSignUp(formData: FormData): SignUpValidation {
  const captchaToken = validateCaptchaToken(
    formData.get("cf-turnstile-response"),
  );
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const errors: SignUpFieldErrors = {};

  if (!validateEmail(email)) {
    errors.email = "Informe um e-mail válido.";
  }

  if (
    password.length < 8 ||
    password.length > 128 ||
    !/[A-Za-z]/.test(password) ||
    !/\d/.test(password)
  ) {
    errors.password = "Use de 8 a 128 caracteres, com letras e números.";
  }

  if (confirmPassword !== password) {
    errors.confirmPassword = "As senhas não coincidem.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors, ok: false };
  }

  return {
    input: { captchaToken, confirmPassword, email, password },
    ok: true,
  };
}

export function validateCaptchaToken(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "";
  const token = value.trim();
  return token.length <= 2048 ? token : "";
}

export function maskEmail(email: string) {
  const [localPart = "", domain = ""] = email.split("@", 2);
  const visible = localPart.slice(0, 1);
  return `${visible}***@${domain}`;
}

export async function requestRegistration(
  gateway: AuthGateway,
  input: SignUpInput,
  emailRedirectTo: string,
): Promise<AuthRequestResult> {
  return gateway.register({
    captchaToken: input.captchaToken,
    email: input.email,
    password: input.password,
    emailRedirectTo,
  });
}

export async function requestConfirmationResend(
  gateway: AuthGateway,
  captchaToken: string,
  email: string,
  emailRedirectTo: string,
): Promise<AuthRequestResult> {
  return gateway.resendConfirmation({
    captchaToken,
    email,
    emailRedirectTo,
  });
}

export async function confirmEmail(
  gateway: AuthGateway,
  tokenHash: string,
): Promise<EmailConfirmationResult> {
  return gateway.confirmEmail(tokenHash);
}
