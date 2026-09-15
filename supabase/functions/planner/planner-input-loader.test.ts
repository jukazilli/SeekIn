import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "../../../packages/contracts/src";
import { createPlannerInputLoader } from "./planner-input-loader";

const USER_ID = "11000000-0000-4000-8000-000000000001";

type QueryResult = { data: unknown; error: null };

class FakeQuery implements PromiseLike<QueryResult> {
  constructor(
    private readonly result: QueryResult,
    private readonly ownerFilters: string[],
    private readonly table: string,
  ) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    if (column === "user_id" && value === USER_ID) {
      this.ownerFilters.push(this.table);
    }
    return this;
  }

  in() {
    return this;
  }

  or() {
    return this;
  }

  limit() {
    return this;
  }

  order() {
    return this;
  }

  single() {
    return Promise.resolve(this.result);
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

describe("planner input loader", () => {
  it("filters every private query by the authenticated owner and normalizes rows", async () => {
    const ownerFilters: string[] = [];
    const rows: Record<string, unknown> = {
      profiles: { timezone: "America/Sao_Paulo" },
      user_preferences: {
        preferred_session_minutes: 50,
        minimum_session_minutes: 25,
        capacity_reserve_percent: 20,
      },
      availability_windows: [
        {
          id: "11000000-0000-4000-8000-000000000011",
          day_of_week: 1,
          start_local: "18:00:00",
          end_local: "20:00:00",
          valid_from: "2026-09-01",
          valid_until: null,
        },
      ],
      calendar_blocks: [],
      activities: [
        {
          id: "11000000-0000-4000-8000-000000000021",
          deadline_at: "2026-09-19T02:59:00Z",
          estimated_minutes: 75,
          actual_minutes: 25,
          priority: 3,
          status: "in_progress",
          created_at: "2026-09-13T12:00:00Z",
        },
      ],
      study_sessions: [],
    };
    const client = {
      from(table: string) {
        return new FakeQuery(
          { data: rows[table] ?? [], error: null },
          ownerFilters,
          table,
        );
      },
    } as unknown as SupabaseClient<Database>;
    const loader = createPlannerInputLoader(
      client,
      () => new Date("2026-09-14T12:00:00Z"),
    );

    const result = await loader.load(USER_ID, {
      contractVersion: 1,
      reason: "manual_request",
      horizonDays: 7,
      expectedCurrentPlanId: null,
    });

    expect(ownerFilters).toEqual([
      "profiles",
      "user_preferences",
      "availability_windows",
      "calendar_blocks",
      "activities",
      "study_sessions",
    ]);
    expect(result).toMatchObject({
      generatedAt: "2026-09-14T12:00:00.000Z",
      horizonStartDate: "2026-09-14",
      horizonEndDate: "2026-09-20",
      timezone: "America/Sao_Paulo",
      preferences: { dailyLimitMinutes: 240 },
      activities: [
        {
          id: "11000000-0000-4000-8000-000000000021",
          remainingMinutes: 50,
          status: "in_progress",
        },
      ],
    });
  });
});
