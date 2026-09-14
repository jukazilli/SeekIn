import type { UserPreferencesInput } from "@seekin/data-access";

import { profileTimezones } from "../profile/profile-flow";

export type OnboardingPreferencesInput = UserPreferencesInput & {
  timezone: (typeof profileTimezones)[number];
};

function integer(formData: FormData, name: string) {
  const raw = formData.get(name);
  if (typeof raw !== "string" || !/^\d{1,3}$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

export function parseOnboardingPreferences(
  formData: FormData,
): OnboardingPreferencesInput | null {
  const timezone = formData.get("timezone");
  const weekStartsOn = integer(formData, "weekStartsOn");
  const preferredSessionMinutes = integer(formData, "preferredSessionMinutes");
  const minimumSessionMinutes = integer(formData, "minimumSessionMinutes");
  const capacityReservePercent = integer(formData, "capacityReservePercent");

  if (
    typeof timezone !== "string" ||
    !profileTimezones.includes(
      timezone as OnboardingPreferencesInput["timezone"],
    ) ||
    weekStartsOn === null ||
    weekStartsOn < 0 ||
    weekStartsOn > 6 ||
    minimumSessionMinutes === null ||
    minimumSessionMinutes < 5 ||
    minimumSessionMinutes > 240 ||
    preferredSessionMinutes === null ||
    preferredSessionMinutes < minimumSessionMinutes ||
    preferredSessionMinutes > 240 ||
    capacityReservePercent === null ||
    capacityReservePercent < 0 ||
    capacityReservePercent > 50
  ) {
    return null;
  }

  return {
    capacity_reserve_percent: capacityReservePercent,
    minimum_session_minutes: minimumSessionMinutes,
    preferred_session_minutes: preferredSessionMinutes,
    timezone: timezone as OnboardingPreferencesInput["timezone"],
    week_starts_on: weekStartsOn,
  };
}
