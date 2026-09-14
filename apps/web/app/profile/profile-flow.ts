import type { Tables } from "@seekin/contracts";

export const profileTimezones = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Recife",
  "America/Fortaleza",
  "America/Cuiaba",
  "America/Rio_Branco",
] as const;

export type Profile = Pick<
  Tables<"profiles">,
  | "display_name"
  | "onboarding_status"
  | "onboarding_step"
  | "revision"
  | "timezone"
  | "user_id"
>;
export type EditableProfile = Pick<
  Profile,
  "display_name" | "revision" | "timezone"
>;

export type ProfileInput = {
  displayName: string | null;
  timezone: (typeof profileTimezones)[number];
};

export function parseProfileInput(formData: FormData): ProfileInput | null {
  const rawName = formData.get("displayName");
  const rawTimezone = formData.get("timezone");
  if (typeof rawName !== "string" || typeof rawTimezone !== "string") {
    return null;
  }

  const displayName = rawName.trim();
  if (displayName.length > 80) return null;
  if (!profileTimezones.includes(rawTimezone as ProfileInput["timezone"])) {
    return null;
  }

  return {
    displayName: displayName || null,
    timezone: rawTimezone as ProfileInput["timezone"],
  };
}
