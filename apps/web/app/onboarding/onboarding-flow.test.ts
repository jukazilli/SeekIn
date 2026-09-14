import { describe, expect, it } from "vitest";

import {
  isAvailableOnboardingStep,
  parseOnboardingMove,
} from "./onboarding-flow";

describe("SKN-050 onboarding navigation", () => {
  function form(intent: string) {
    const data = new FormData();
    data.set("intent", intent);
    return data;
  }

  it("moves only one available step at a time", () => {
    expect(parseOnboardingMove(form("next"), 0)).toBe(1);
    expect(parseOnboardingMove(form("back"), 1)).toBe(0);
  });

  it("does not advance into a step that is not implemented", () => {
    expect(parseOnboardingMove(form("next"), 2)).toBeNull();
    expect(isAvailableOnboardingStep(7)).toBe(false);
  });

  it("rejects unknown intents", () => {
    expect(parseOnboardingMove(form("skip"), 0)).toBeNull();
  });
});
