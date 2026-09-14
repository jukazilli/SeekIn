import { describe, expect, it, vi } from "vitest";

import { replaceActiveAvailabilityWindows } from "./availability-repository";

function updateQuery(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["eq", "maybeSingle", "select", "update"])
    chain[method] = vi.fn(() => chain);
  chain.maybeSingle?.mockResolvedValue(result);
  return chain;
}

describe("SKN-052 availability repository", () => {
  it("archives by owner and revision before inserting the replacement", async () => {
    const archived = updateQuery({ data: { id: "old-1" }, error: null });
    const inserted = {
      insert: vi.fn(() => inserted),
      select: vi
        .fn()
        .mockResolvedValue({ data: [{ id: "new-1" }], error: null }),
    };
    const from = vi
      .fn()
      .mockReturnValueOnce(archived)
      .mockReturnValueOnce(inserted);

    await expect(
      replaceActiveAvailabilityWindows(
        { from } as never,
        "user-1",
        "America/Recife",
        "2026-09-14",
        [
          {
            day_of_week: 1,
            end_local: "20:00:00",
            id: "old-1",
            revision: 3,
            start_local: "18:00:00",
            timezone: "America/Recife",
          },
        ],
        [{ day_of_week: 1, start_local: "19:00", end_local: "21:00" }],
      ),
    ).resolves.toEqual([{ id: "new-1" }]);

    expect(archived.update).toHaveBeenCalledWith({
      status: "archived",
      valid_until: "2026-09-14",
    });
    expect(archived.eq).toHaveBeenNthCalledWith(1, "id", "old-1");
    expect(archived.eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
    expect(archived.eq).toHaveBeenNthCalledWith(3, "revision", 3);
    expect(inserted.insert).toHaveBeenCalledWith([
      {
        day_of_week: 1,
        end_local: "21:00",
        start_local: "19:00",
        timezone: "America/Recife",
        user_id: "user-1",
        valid_from: "2026-09-14",
      },
    ]);
  });
});
