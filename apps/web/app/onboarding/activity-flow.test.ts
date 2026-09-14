import { describe, expect, it } from "vitest";

import { parseOnboardingActivity } from "./activity-flow";

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    activityNotes: "",
    activityPriority: "2",
    activityTitle: "Lista de exercícios",
    activityType: "exercise",
    deadlineDate: "2026-09-18",
    deadlineTime: "",
    disciplineId: "discipline-1",
    effortHours: "1",
    effortMinutes: "40",
    ...overrides,
  }))
    data.set(key, value);
  return data;
}

describe("SKN-055 onboarding activity", () => {
  it("resolves a deadline without time as 23:59 in the profile timezone", () => {
    expect(
      parseOnboardingActivity(
        form(),
        "America/Sao_Paulo",
        new Set(["discipline-1"]),
      ),
    ).toMatchObject({
      deadline_at: "2026-09-19T02:59:00Z",
      deadline_has_time: false,
      deadline_local_time: null,
      estimated_minutes: 100,
    });
  });

  it("preserves an informed local time and permits no discipline", () => {
    expect(
      parseOnboardingActivity(
        form({ deadlineTime: "21:00", disciplineId: "" }),
        "America/Sao_Paulo",
        new Set(),
      ),
    ).toMatchObject({
      deadline_at: "2026-09-19T00:00:00Z",
      deadline_has_time: true,
      deadline_local_time: "21:00",
      discipline_id: null,
    });
  });

  it("rejects invalid effort, date and foreign disciplines", () => {
    expect(
      parseOnboardingActivity(
        form({ effortHours: "0", effortMinutes: "0" }),
        "UTC",
        new Set(["discipline-1"]),
      ),
    ).toBeNull();
    expect(
      parseOnboardingActivity(
        form({ deadlineDate: "2026-02-30" }),
        "UTC",
        new Set(["discipline-1"]),
      ),
    ).toBeNull();
    expect(parseOnboardingActivity(form(), "UTC", new Set())).toBeNull();
  });
});
