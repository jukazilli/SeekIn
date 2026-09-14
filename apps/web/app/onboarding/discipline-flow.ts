export function parseOnboardingDiscipline(formData: FormData) {
  const value = formData.get("disciplineName");
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name.length >= 1 && name.length <= 120 ? { name } : null;
}
