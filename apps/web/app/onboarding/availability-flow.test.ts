import { describe, expect, it } from "vitest";

import { parseAvailabilityWindows } from "./availability-flow";

function form(rows: Array<[number, string, string]>) {
  const data = new FormData();
  for (const [day, start, end] of rows) {
    data.append("availabilityDay", String(day));
    data.append("availabilityStart", start);
    data.append("availabilityEnd", end);
  }
  return data;
}

describe("SKN-052 availability flow", () => {
  it("accepts and orders valid weekly windows", () => {
    expect(
      parseAvailabilityWindows(
        form([
          [2, "18:00", "20:00"],
          [1, "08:00", "09:00"],
        ]),
      ),
    ).toEqual([
      { day_of_week: 1, start_local: "08:00", end_local: "09:00" },
      { day_of_week: 2, start_local: "18:00", end_local: "20:00" },
    ]);
  });

  it("consolidates overlapping and adjacent windows", () => {
    expect(
      parseAvailabilityWindows(
        form([
          [1, "18:00", "20:00"],
          [1, "19:00", "21:00"],
          [1, "21:00", "22:00"],
        ]),
      ),
    ).toEqual([{ day_of_week: 1, start_local: "18:00", end_local: "22:00" }]);
  });

  it("rejects invalid rows", () => {
    const invalidRows: Array<[number, string, string]> = [
      [1, "20:00", "18:00"],
      [1, "18:00", "18:00"],
      [7, "18:00", "19:00"],
      [1, "25:00", "26:00"],
    ];
    for (const row of invalidRows)
      expect(parseAvailabilityWindows(form([row]))).toBeNull();
  });

  it("rejects an empty implicit submission", () => {
    expect(parseAvailabilityWindows(new FormData())).toBeNull();
  });
});
