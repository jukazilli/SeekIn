import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../packages/contracts/src/index.ts";
import {
  PLANNER_CORE_CONTRACT_VERSION,
  PLANNER_CORE_VERSION,
  PLANNER_RULES_VERSION,
  resolvePlannerLocalInstant,
  type PlannerInput,
} from "../../../packages/planner-core/src/index.ts";
import type { GenerateRequest, PlannerInputLoader } from "./generate-core.ts";

const DAY_MS = 86_400_000;
const DAILY_LIMIT_MINUTES = 240;

function dateAtOffset(date: string, offset: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + offset * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function localDate(instant: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

function ensureQuery<T>(result: { data: T | null; error: unknown }): T {
  if (result.error || result.data === null)
    throw new Error("database query failed");
  return result.data;
}

export function createPlannerInputLoader(
  client: SupabaseClient<Database>,
  now: () => Date = () => new Date(),
): PlannerInputLoader {
  return {
    async load(
      userId: string,
      request: GenerateRequest,
    ): Promise<PlannerInput> {
      const generatedAt = now();
      const profileResult = await client
        .from("profiles")
        .select("timezone")
        .eq("user_id", userId)
        .single();
      const profile = ensureQuery(profileResult);
      const horizonStartDate = localDate(generatedAt, profile.timezone);
      const horizonEndDate = dateAtOffset(
        horizonStartDate,
        request.horizonDays - 1,
      );

      const [
        preferencesResult,
        availabilityResult,
        blocksResult,
        activitiesResult,
      ] = await Promise.all([
        client
          .from("user_preferences")
          .select(
            "preferred_session_minutes,minimum_session_minutes,capacity_reserve_percent",
          )
          .eq("user_id", userId)
          .single(),
        client
          .from("availability_windows")
          .select("id,day_of_week,start_local,end_local,valid_from,valid_until")
          .eq("user_id", userId)
          .eq("status", "active"),
        client
          .from("calendar_blocks")
          .select(
            "id,kind,day_of_week,start_local,end_local,starts_at,ends_at,valid_from,valid_until,timezone",
          )
          .eq("user_id", userId),
        client
          .from("activities")
          .select(
            "id,deadline_at,estimated_minutes,actual_minutes,priority,status,created_at",
          )
          .eq("user_id", userId)
          .in("status", ["active", "in_progress"])
          .limit(201),
      ]);
      const preferences = ensureQuery(preferencesResult);
      const availabilityRows = ensureQuery(availabilityResult);
      const blockRows = ensureQuery(blocksResult);
      const activityRows = ensureQuery(activitiesResult);
      const activityIds = activityRows.map(({ id }) => id);
      const sessionRows =
        activityIds.length === 0
          ? []
          : ensureQuery(
              await client
                .from("study_sessions")
                .select("id,activity_id,status,is_pinned,source")
                .eq("user_id", userId)
                .in("activity_id", activityIds)
                .or(
                  "status.in.(completed,in_progress),is_pinned.eq.true,source.eq.manual",
                ),
            );
      const sessionIds = sessionRows.map(({ id }) => id);
      const [itemRows, executionRows] =
        sessionIds.length === 0
          ? [[], []]
          : [
              ensureQuery(
                await client
                  .from("plan_items")
                  .select(
                    "session_id,planned_start_at,planned_end_at,planned_minutes,created_at",
                  )
                  .eq("user_id", userId)
                  .in("session_id", sessionIds)
                  .order("created_at", { ascending: false }),
              ),
              ensureQuery(
                await client
                  .from("session_executions")
                  .select("session_id,actual_minutes")
                  .eq("user_id", userId)
                  .in("session_id", sessionIds),
              ),
            ];
      const latestItemBySession = new Map<string, (typeof itemRows)[number]>();
      for (const item of itemRows) {
        if (!latestItemBySession.has(item.session_id)) {
          latestItemBySession.set(item.session_id, item);
        }
      }
      const actualBySession = new Map(
        executionRows.map((execution) => [
          execution.session_id,
          execution.actual_minutes ?? 0,
        ]),
      );

      const availability = availabilityRows
        .filter(
          (window) =>
            window.valid_from <= horizonEndDate &&
            (!window.valid_until || window.valid_until >= horizonStartDate),
        )
        .map((window) => ({
          id: window.id,
          dayOfWeek: window.day_of_week,
          startLocal: window.start_local,
          endLocal: window.end_local,
        }));
      const blocks: PlannerInput["blocks"] = [];
      for (const block of blockRows) {
        if (block.kind === "one_off" && block.starts_at && block.ends_at) {
          if (
            Date.parse(block.ends_at) >= generatedAt.getTime() &&
            Date.parse(block.starts_at) <=
              Date.parse(`${horizonEndDate}T23:59:59.999Z`)
          ) {
            blocks.push({
              id: block.id,
              startsAt: block.starts_at,
              endsAt: block.ends_at,
              kind: "calendar_block",
            });
          }
          continue;
        }
        if (
          block.kind !== "recurring" ||
          block.day_of_week === null ||
          !block.start_local ||
          !block.end_local ||
          !block.valid_from ||
          block.valid_from > horizonEndDate ||
          (block.valid_until && block.valid_until < horizonStartDate)
        ) {
          continue;
        }
        for (
          let date = horizonStartDate;
          date <= horizonEndDate;
          date = dateAtOffset(date, 1)
        ) {
          if (
            dayOfWeek(date) === block.day_of_week &&
            date >= block.valid_from &&
            (!block.valid_until || date <= block.valid_until)
          ) {
            blocks.push({
              id: block.id,
              startsAt: resolvePlannerLocalInstant(
                date,
                block.start_local,
                block.timezone,
              ),
              endsAt: resolvePlannerLocalInstant(
                date,
                block.end_local,
                block.timezone,
              ),
              kind: "recurring_commitment",
            });
          }
        }
      }

      return {
        contractVersion: PLANNER_CORE_CONTRACT_VERSION,
        plannerVersion: PLANNER_CORE_VERSION,
        rulesVersion: PLANNER_RULES_VERSION,
        generatedAt: generatedAt.toISOString(),
        timezone: profile.timezone,
        horizonStartDate,
        horizonEndDate,
        preferences: {
          preferredSessionMinutes: preferences.preferred_session_minutes,
          minimumSessionMinutes: preferences.minimum_session_minutes,
          reservePercent: preferences.capacity_reserve_percent,
          dailyLimitMinutes: DAILY_LIMIT_MINUTES,
        },
        availability,
        blocks,
        activities: activityRows
          .map((activity) => ({
            id: activity.id,
            deadlineAt: activity.deadline_at,
            remainingMinutes:
              activity.estimated_minutes - activity.actual_minutes,
            priority: activity.priority,
            status:
              activity.status === "in_progress"
                ? ("in_progress" as const)
                : ("not_started" as const),
            createdAt: activity.created_at,
            dependencyIds: [],
          }))
          .filter(({ remainingMinutes }) => remainingMinutes > 0),
        protectedSessions: sessionRows.flatMap((session) => {
          const item = latestItemBySession.get(session.id);
          if (!item) return [];
          const protection =
            session.status === "completed"
              ? ("completed" as const)
              : session.status === "in_progress"
                ? ("in_progress" as const)
                : session.is_pinned
                  ? ("pinned" as const)
                  : ("manual" as const);
          return [
            {
              id: session.id,
              activityId: session.activity_id,
              startsAt: item.planned_start_at,
              endsAt: item.planned_end_at,
              actualMinutes: actualBySession.get(session.id) ?? 0,
              protection,
            },
          ];
        }),
      };
    },
  };
}
