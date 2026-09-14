import { createClient } from "@supabase/supabase-js";
import type { AuthError } from "@supabase/supabase-js";

export type AuthRequestResult =
  "accepted" | "challenge_failed" | "rate_limited" | "unavailable";
export type EmailConfirmationResult = "confirmed" | "invalid" | "unavailable";

type AuthOperationError = Pick<AuthError, "code" | "status">;

interface AuthOperations {
  resend(input: {
    email: string;
    options: { captchaToken: string; emailRedirectTo: string };
    type: "signup";
  }): Promise<{ error: AuthOperationError | null }>;
  signUp(input: {
    email: string;
    options: { captchaToken: string; emailRedirectTo: string };
    password: string;
  }): Promise<{ error: AuthOperationError | null }>;
  verifyOtp(input: {
    token_hash: string;
    type: "email";
  }): Promise<{ error: AuthOperationError | null }>;
}

export interface AuthGateway {
  confirmEmail(tokenHash: string): Promise<EmailConfirmationResult>;
  register(input: {
    captchaToken: string;
    email: string;
    emailRedirectTo: string;
    password: string;
  }): Promise<AuthRequestResult>;
  resendConfirmation(input: {
    captchaToken: string;
    email: string;
    emailRedirectTo: string;
  }): Promise<AuthRequestResult>;
}

export interface SupabaseAuthGatewayConfig {
  publishableKey: string;
  url: string;
}

function classifyRequestError(error: AuthOperationError | null) {
  if (!error) return "accepted" as const;
  if (error.code === "captcha_failed") return "challenge_failed" as const;
  if (error.status === 429) return "rate_limited" as const;
  if (error.status && error.status >= 500) return "unavailable" as const;

  // Client errors from sign-up and resend stay deliberately indistinguishable.
  // Supabase can return different 4xx responses for existing, confirmed or
  // administratively restricted addresses; exposing those details would allow
  // account enumeration.
  return "accepted" as const;
}

export function createAuthGateway(operations: AuthOperations): AuthGateway {
  return {
    async confirmEmail(tokenHash) {
      try {
        const { error } = await operations.verifyOtp({
          token_hash: tokenHash,
          type: "email",
        });

        if (!error) return "confirmed";
        return error.status && error.status >= 500 ? "unavailable" : "invalid";
      } catch {
        return "unavailable";
      }
    },

    async register({ captchaToken, email, emailRedirectTo, password }) {
      try {
        const { error } = await operations.signUp({
          email,
          password,
          options: { captchaToken, emailRedirectTo },
        });
        return classifyRequestError(error);
      } catch {
        return "unavailable";
      }
    },

    async resendConfirmation({ captchaToken, email, emailRedirectTo }) {
      try {
        const { error } = await operations.resend({
          type: "signup",
          email,
          options: { captchaToken, emailRedirectTo },
        });
        return classifyRequestError(error);
      } catch {
        return "unavailable";
      }
    },
  };
}

export function createSupabaseAuthGateway({
  publishableKey,
  url,
}: SupabaseAuthGatewayConfig): AuthGateway {
  const client = createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  return createAuthGateway(client.auth);
}
