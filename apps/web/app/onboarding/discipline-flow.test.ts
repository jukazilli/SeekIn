import { describe, expect, it } from "vitest";

import { parseOnboardingDiscipline } from "./discipline-flow";

describe("SKN-054 onboarding discipline", () => {
  it("normalizes a valid discipline name", () => {
    const form = new FormData();
    form.set("disciplineName", "  Cálculo I  ");
    expect(parseOnboardingDiscipline(form)).toEqual({ name: "Cálculo I" });
  });

  it("rejects an empty or oversized name", () => {
    for (const name of ["   ", "a".repeat(121)]) {
      const form = new FormData();
      form.set("disciplineName", name);
      expect(parseOnboardingDiscipline(form)).toBeNull();
    }
  });
});
