import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  PublicTableInsert,
  PublicTableRow,
  PublicTableUpdate,
} from "@seekin/contracts";

export type Activity = PublicTableRow<"activities">;
export type NewActivity = PublicTableInsert<"activities">;
export type ActivityChanges = Omit<
  PublicTableUpdate<"activities">,
  "created_at" | "id" | "revision" | "updated_at" | "user_id"
>;

export interface ActivityRepository {
  create(input: NewActivity): Promise<Activity>;
  findById(userId: string, activityId: string): Promise<Activity | null>;
  list(userId: string): Promise<readonly Activity[]>;
  update(
    userId: string,
    activityId: string,
    expectedRevision: number,
    changes: ActivityChanges,
  ): Promise<Activity>;
}

export class RepositoryError extends Error {
  readonly code = "REPOSITORY_UNAVAILABLE";

  constructor() {
    super("The repository operation could not be completed.");
    this.name = "RepositoryError";
  }
}

export function createSupabaseActivityRepository(
  client: SupabaseClient<Database>,
): ActivityRepository {
  return {
    async create(input) {
      const { data, error } = await client
        .from("activities")
        .insert(input)
        .select()
        .single();

      if (error) throw new RepositoryError();
      return data;
    },

    async findById(userId, activityId) {
      const { data, error } = await client
        .from("activities")
        .select()
        .eq("user_id", userId)
        .eq("id", activityId)
        .maybeSingle();

      if (error) throw new RepositoryError();
      return data;
    },

    async list(userId) {
      const { data, error } = await client
        .from("activities")
        .select()
        .eq("user_id", userId)
        .order("deadline_at", { ascending: true });

      if (error) throw new RepositoryError();
      return data;
    },

    async update(userId, activityId, expectedRevision, changes) {
      const { data, error } = await client
        .from("activities")
        .update(changes)
        .eq("user_id", userId)
        .eq("id", activityId)
        .eq("revision", expectedRevision)
        .select()
        .single();

      if (error) throw new RepositoryError();
      return data;
    },
  };
}
