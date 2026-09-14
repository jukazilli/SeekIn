import type { Database, Tables } from "@seekin/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Discipline = Pick<
  Tables<"disciplines">,
  "color_key" | "description" | "id" | "name" | "revision"
>;

const selection = "id,name,description,color_key,revision" as const;

export async function listActiveDisciplines(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<Discipline[] | null> {
  const result = await client
    .from("disciplines")
    .select(selection)
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at");
  return result.error ? null : result.data;
}

export async function saveOnboardingDiscipline(
  client: SupabaseClient<Database>,
  userId: string,
  current: Discipline | null,
  name: string,
): Promise<Discipline | null> {
  if (current?.name.toLocaleLowerCase() === name.toLocaleLowerCase())
    return current;
  const query = current
    ? client
        .from("disciplines")
        .update({ name })
        .eq("id", current.id)
        .eq("user_id", userId)
        .eq("revision", current.revision)
    : client.from("disciplines").insert({ name, user_id: userId });
  const result = await query.select(selection).maybeSingle();
  return result.error ? null : result.data;
}
