import type { Database, Tables } from "@seekin/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RecurringCalendarBlock = Pick<
  Tables<"calendar_blocks">,
  | "day_of_week"
  | "end_local"
  | "id"
  | "revision"
  | "start_local"
  | "timezone"
  | "title"
>;

export type RecurringCalendarBlockInput = Pick<
  RecurringCalendarBlock,
  "day_of_week" | "end_local" | "start_local" | "title"
>;

const selection =
  "id,title,day_of_week,start_local,end_local,timezone,revision" as const;

export async function listRecurringCalendarBlocks(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<RecurringCalendarBlock[] | null> {
  const result = await client
    .from("calendar_blocks")
    .select(selection)
    .eq("user_id", userId)
    .eq("kind", "recurring")
    .order("day_of_week")
    .order("start_local");
  return result.error ? null : result.data;
}

export async function replaceRecurringCalendarBlocks(
  client: SupabaseClient<Database>,
  userId: string,
  timezone: string,
  validFrom: string,
  current: RecurringCalendarBlock[],
  blocks: RecurringCalendarBlockInput[],
) {
  for (const block of current) {
    const removed = await client
      .from("calendar_blocks")
      .delete()
      .eq("id", block.id)
      .eq("user_id", userId)
      .eq("revision", block.revision)
      .select("id")
      .maybeSingle();
    if (removed.error || !removed.data) return null;
  }
  if (blocks.length === 0) return [];
  const created = await client
    .from("calendar_blocks")
    .insert(
      blocks.map((block) => ({
        ...block,
        kind: "recurring",
        source: "manual",
        timezone,
        user_id: userId,
        valid_from: validFrom,
      })),
    )
    .select(selection);
  return created.error ? null : created.data;
}
