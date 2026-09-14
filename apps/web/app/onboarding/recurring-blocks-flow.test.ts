import { describe, expect, it } from "vitest";

import { parseRecurringBlocks } from "./recurring-blocks-flow";

function form(rows: Array<[string, string, string, string]>) {
  const data = new FormData();
  for (const [title, days, start, end] of rows) {
    data.append("blockTitle", title);
    data.append("blockDays", days);
    data.append("blockStart", start);
    data.append("blockEnd", end);
  }
  return data;
}

describe("SKN-053 recurring blocks flow", () => {
  it("expands selected days into recurring rows", () => {
    expect(
      parseRecurringBlocks(form([["Academia", "1,3,5", "10:00", "11:00"]])),
    ).toEqual({
      blocks: [1, 3, 5].map((day) => ({
        day_of_week: day,
        end_local: "11:00",
        start_local: "10:00",
        title: "Academia",
      })),
      ok: true,
    });
  });

  it("identifies overlapping commitments by name", () => {
    expect(
      parseRecurringBlocks(
        form([
          ["Trabalho", "1", "09:00", "12:00"],
          ["Academia", "1", "10:00", "11:00"],
        ]),
      ),
    ).toEqual({
      message: "Trabalho e Academia se sobrepõem no mesmo dia.",
      ok: false,
    });
  });

  it("rejects incomplete or invalid commitments", () => {
    const invalidRows: Array<[string, string, string, string]> = [
      ["", "1", "10:00", "11:00"],
      ["Academia", "", "10:00", "11:00"],
      ["Academia", "1", "11:00", "10:00"],
      ["Academia", "8", "10:00", "11:00"],
    ];
    for (const row of invalidRows)
      expect(parseRecurringBlocks(form([row])).ok).toBe(false);
  });
});
