import type { Database, Tables } from "@seekin/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Profile = Pick<
  Tables<"profiles">,
  "display_name" | "revision" | "timezone" | "user_id"
>;

export async function ensureProfile(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<Profile | null> {
  const existing = await client
    .from("profiles")
    .select("user_id,display_name,timezone,revision")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing.error) return null;
  if (existing.data) return existing.data;

  const created = await client
    .from("profiles")
    .insert({ user_id: userId })
    .select("user_id,display_name,timezone,revision")
    .single();
  if (!created.error) return created.data;

  // Uma requisição concorrente pode ter criado o perfil entre o SELECT e o INSERT.
  if (created.error.code !== "23505") return null;
  const raced = await client
    .from("profiles")
    .select("user_id,display_name,timezone,revision")
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
    .select("user_id,display_name,timezone,revision")
    .maybeSingle();
  return result.error ? null : result.data;
}
