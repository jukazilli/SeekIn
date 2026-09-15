import { describe, expect, it } from "vitest";

import { reconcileImpactSessions } from "./impact-analysis";

describe("UT planner-core — análise de impacto", () => {
  it("classifica sessões mantidas, movidas, criadas e removidas preservando identidades", () => {
    const result = reconcileImpactSessions(
      [
        {
          activityId: "11000000-0000-4000-8000-000000000021",
          startsAt: "2026-09-15T21:00:00Z",
          endsAt: "2026-09-15T21:50:00Z",
          plannedMinutes: 50,
          rationaleCode: "earliest_deadline",
        },
        {
          activityId: "11000000-0000-4000-8000-000000000022",
          startsAt: "2026-09-16T21:00:00Z",
          endsAt: "2026-09-16T21:50:00Z",
          plannedMinutes: 50,
          rationaleCode: "lowest_slack",
        },
        {
          activityId: "11000000-0000-4000-8000-000000000024",
          startsAt: "2026-09-17T21:00:00Z",
          endsAt: "2026-09-17T21:50:00Z",
          plannedMinutes: 50,
          rationaleCode: "manual_priority",
        },
      ],
      [],
      [
        {
          sessionId: "11000000-0000-4000-8000-000000000041",
          activityId: "11000000-0000-4000-8000-000000000021",
          startsAt: "2026-09-15T21:00:00Z",
          endsAt: "2026-09-15T21:50:00Z",
          plannedMinutes: 50,
        },
        {
          sessionId: "11000000-0000-4000-8000-000000000042",
          activityId: "11000000-0000-4000-8000-000000000022",
          startsAt: "2026-09-15T22:00:00Z",
          endsAt: "2026-09-15T22:50:00Z",
          plannedMinutes: 50,
        },
        {
          sessionId: "11000000-0000-4000-8000-000000000043",
          activityId: "11000000-0000-4000-8000-000000000023",
          startsAt: "2026-09-16T22:00:00Z",
          endsAt: "2026-09-16T22:50:00Z",
          plannedMinutes: 50,
        },
      ],
    );

    expect(
      result.sessions.map(({ sessionId, changeKind }) => [
        sessionId,
        changeKind,
      ]),
    ).toEqual([
      ["11000000-0000-4000-8000-000000000041", "kept"],
      ["11000000-0000-4000-8000-000000000042", "moved"],
      [null, "created"],
    ]);
    expect(result.removedSessionIds).toEqual([
      "11000000-0000-4000-8000-000000000043",
    ]);
  });
});
