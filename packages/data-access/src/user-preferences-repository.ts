import type { Database, Tables } from "@seekin/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";

export type UserPreferences = Pick<
  Tables<"user_preferences">,
  | "capacity_reserve_percent"
  | "minimum_session_minutes"
  | "preferred_session_minutes"
  | "revision"
  | "user_id"
  | "week_starts_on"
>;

export type UserPreferencesInput = Omit<
  UserPreferences,
  "revision" | "user_id"
>;

const selection =
  "user_id,week_starts_on,preferred_session_minutes,minimum_session_minutes,capacity_reserve_percent,revision" as const;

export async function ensureUserPreferences(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<UserPreferences | null> {
  const existing = await client
    .from("user_preferences")
    .select(selection)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing.error) return null;
  if (existing.data) return existing.data;

  const created = await client
    .from("user_preferences")
    .insert({ user_id: userId })
    .select(selection)
    .single();
  if (!created.error) return created.data;
  if (created.error.code !== "23505") return null;

  const raced = await client
    .from("user_preferences")
    .select(selection)
    .eq("user_id", userId)
    .single();
  return raced.error ? null : raced.data;
}

export async function updateUserPreferences(
  client: SupabaseClient<Database>,
  userId: string,
  revision: number,
  input: UserPreferencesInput,
) {
  const result = await client
    .from("user_preferences")
    .update(input)
    .eq("user_id", userId)
    .eq("revision", revision)
    .select(selection)
    .maybeSingle();
  return result.error ? null : result.data;
}
