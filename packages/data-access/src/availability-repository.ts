import type { Database, Tables } from "@seekin/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AvailabilityWindow = Pick<
  Tables<"availability_windows">,
  "day_of_week" | "end_local" | "id" | "revision" | "start_local" | "timezone"
>;

export type AvailabilityWindowInput = Pick<
  AvailabilityWindow,
  "day_of_week" | "end_local" | "start_local"
>;

const selection =
  "id,day_of_week,start_local,end_local,timezone,revision" as const;

export async function listActiveAvailabilityWindows(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<AvailabilityWindow[] | null> {
  const result = await client
    .from("availability_windows")
    .select(selection)
    .eq("user_id", userId)
    .eq("status", "active")
    .order("day_of_week")
    .order("start_local");
  return result.error ? null : result.data;
}

export async function replaceActiveAvailabilityWindows(
  client: SupabaseClient<Database>,
  userId: string,
  timezone: string,
  validFrom: string,
  current: AvailabilityWindow[],
  windows: AvailabilityWindowInput[],
) {
  for (const window of current) {
    const archived = await client
      .from("availability_windows")
      .update({ status: "archived", valid_until: validFrom })
      .eq("id", window.id)
      .eq("user_id", userId)
      .eq("revision", window.revision)
      .select("id")
      .maybeSingle();
    if (archived.error || !archived.data) return null;
  }

  if (windows.length === 0) return [];
  const created = await client
    .from("availability_windows")
    .insert(
      windows.map((window) => ({
        ...window,
        timezone,
        user_id: userId,
        valid_from: validFrom,
      })),
    )
    .select(selection);
  return created.error ? null : created.data;
}
