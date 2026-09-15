import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../packages/contracts/src/index.ts";
import type { GenerateRequest } from "./generate-core.ts";
import {
  ImpactResourceNotFound,
  ImpactStalePlan,
  type ImpactLoader,
  type ImpactRequest,
} from "./impact-core.ts";
import { createPlannerInputLoader } from "./planner-input-loader.ts";

function queryFailed(error: unknown): asserts error is null {
  if (error) throw new Error("database query failed");
}

export function createImpactInputLoader(
  client: SupabaseClient<Database>,
  now: () => Date = () => new Date(),
): ImpactLoader {
  const plannerLoader = createPlannerInputLoader(client, now);
  return {
    async load(
      userId: string,
      request: ImpactRequest,
      generationRequest: GenerateRequest,
    ) {
      const triggerQuery =
        request.trigger.type === "activity_changed"
          ? client
              .from("activities")
              .select("id")
              .eq("id", request.trigger.entityId)
              .eq("user_id", userId)
              .maybeSingle()
          : request.trigger.type === "availability_changed"
            ? client
                .from("availability_windows")
                .select("id")
                .eq("id", request.trigger.entityId)
                .eq("user_id", userId)
                .maybeSingle()
            : client
                .from("calendar_blocks")
                .select("id")
                .eq("id", request.trigger.entityId)
                .eq("user_id", userId)
                .maybeSingle();
      const trigger = await triggerQuery;
      queryFailed(trigger.error);
      if (!trigger.data) throw new ImpactResourceNotFound();

      const plan = await client
        .from("plans")
        .select("id")
        .eq("id", request.expectedCurrentPlanId)
        .eq("user_id", userId)
        .eq("status", "published")
        .maybeSingle();
      queryFailed(plan.error);
      if (!plan.data) throw new ImpactStalePlan();

      const items = await client
        .from("plan_items")
        .select("session_id,planned_start_at,planned_end_at,planned_minutes")
        .eq("user_id", userId)
        .eq("plan_id", request.expectedCurrentPlanId);
      queryFailed(items.error);
      const sessionIds = items.data.map(({ session_id }) => session_id);
      const sessions =
        sessionIds.length === 0
          ? { data: [], error: null }
          : await client
              .from("study_sessions")
              .select("id,activity_id")
              .eq("user_id", userId)
              .in("id", sessionIds);
      queryFailed(sessions.error);
      const activityBySession = new Map(
        sessions.data.map(({ id, activity_id }) => [id, activity_id]),
      );

      return {
        input: await plannerLoader.load(userId, generationRequest),
        currentSessions: items.data.flatMap((item) => {
          const activityId = activityBySession.get(item.session_id);
          return activityId
            ? [
                {
                  sessionId: item.session_id,
                  activityId,
                  startsAt: item.planned_start_at,
                  endsAt: item.planned_end_at,
                  plannedMinutes: item.planned_minutes,
                },
              ]
            : [];
        }),
      };
    },
  };
}
