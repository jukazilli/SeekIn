import { describe, expect, it } from "vitest";

import { parseOnboardingPreferences } from "./preferences-flow";

function validForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  const values = {
    capacityReservePercent: "20",
    minimumSessionMinutes: "25",
    preferredSessionMinutes: "50",
    timezone: "America/Sao_Paulo",
    weekStartsOn: "1",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

describe("SKN-051 preference input", () => {
  it("accepts the documented defaults and explicit units", () => {
    expect(parseOnboardingPreferences(validForm())).toEqual({
      capacity_reserve_percent: 20,
      minimum_session_minutes: 25,
      preferred_session_minutes: 50,
      timezone: "America/Sao_Paulo",
      week_starts_on: 1,
    });
  });

  const invalidOverrides: Array<Record<string, string>> = [
    { capacityReservePercent: "51" },
    { minimumSessionMinutes: "4" },
    { preferredSessionMinutes: "241" },
    { timezone: "Etc/Unknown" },
    { weekStartsOn: "7" },
  ];

  it.each(invalidOverrides)(
    "rejects a value outside the canonical limits: %o",
    (override) => {
      expect(parseOnboardingPreferences(validForm(override))).toBeNull();
    },
  );

  it("rejects a default session shorter than the minimum", () => {
    expect(
      parseOnboardingPreferences(
        validForm({
          minimumSessionMinutes: "50",
          preferredSessionMinutes: "25",
        }),
      ),
    ).toBeNull();
  });
});
