import type { Database, Tables } from "@seekin/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Profile = Pick<
  Tables<"profiles">,
  | "display_name"
  | "onboarding_status"
  | "onboarding_step"
  | "revision"
  | "timezone"
  | "user_id"
>;

const profileSelection =
  "user_id,display_name,timezone,onboarding_status,onboarding_step,revision" as const;

export async function ensureProfile(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<Profile | null> {
  const existing = await client
    .from("profiles")
    .select(profileSelection)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing.error) return null;
  if (existing.data) return existing.data;

  const created = await client
    .from("profiles")
    .insert({ user_id: userId })
    .select(profileSelection)
    .single();
  if (!created.error) return created.data;

  // Uma requisição concorrente pode ter criado o perfil entre o SELECT e o INSERT.
  if (created.error.code !== "23505") return null;
  const raced = await client
    .from("profiles")
    .select(profileSelection)
    .eq("user_id", userId)
    .single();
  return raced.error ? null : raced.data;
}

export async function updateProfile(
  client: SupabaseClient<Database>,
  userId: string,
  revision: number,
  input: { displayName: string | null; timezone: string },
) {
  const result = await client
    .from("profiles")
    .update({ display_name: input.displayName, timezone: input.timezone })
    .eq("user_id", userId)
    .eq("revision", revision)
    .select(profileSelection)
    .maybeSingle();
  return result.error ? null : result.data;
}

export async function updateOnboardingProgress(
  client: SupabaseClient<Database>,
  userId: string,
  revision: number,
  step: number,
) {
  const result = await client
    .from("profiles")
    .update({ onboarding_status: "in_progress", onboarding_step: step })
    .eq("user_id", userId)
    .eq("revision", revision)
    .select(profileSelection)
    .maybeSingle();
  return result.error ? null : result.data;
}
