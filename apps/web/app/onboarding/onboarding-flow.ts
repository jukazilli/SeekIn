export const onboardingStepCount = 7;
export const availableOnboardingSteps = [0, 1, 2, 3] as const;

export type AvailableOnboardingStep = (typeof availableOnboardingSteps)[number];

export function isAvailableOnboardingStep(
  step: number,
): step is AvailableOnboardingStep {
  return availableOnboardingSteps.includes(step as AvailableOnboardingStep);
}

export function parseOnboardingMove(
  formData: FormData,
  currentStep: number,
): AvailableOnboardingStep | null {
  const intent = formData.get("intent");
  const target = intent === "next" ? currentStep + 1 : currentStep - 1;

  if (intent !== "next" && intent !== "back") return null;
  if (Math.abs(target - currentStep) !== 1) return null;
  return isAvailableOnboardingStep(target) ? target : null;
}
