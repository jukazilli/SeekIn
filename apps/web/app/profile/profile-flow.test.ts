import { describe, expect, it } from "vitest";

import { parseProfileInput } from "./profile-flow";

describe("SKN-044 profile input", () => {
  it("accepts a trimmed name and a supported timezone", () => {
    const form = new FormData();
    form.set("displayName", "  Ana Silva  ");
    form.set("timezone", "America/Recife");
    expect(parseProfileInput(form)).toEqual({
      displayName: "Ana Silva",
      timezone: "America/Recife",
    });
  });

  it("rejects an unsupported timezone and an oversized name", () => {
    const form = new FormData();
    form.set("displayName", "A".repeat(81));
    form.set("timezone", "Etc/Unknown");
    expect(parseProfileInput(form)).toBeNull();
  });
});
