import { describe, expect, it, vi } from "vitest";

import { replaceRecurringCalendarBlocks } from "./calendar-blocks-repository";

function deleteQuery(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["delete", "eq", "maybeSingle", "select"])
    chain[method] = vi.fn(() => chain);
  chain.maybeSingle?.mockResolvedValue(result);
  return chain;
}

describe("SKN-053 recurring calendar blocks repository", () => {
  it("replaces only owner and revision matched rows", async () => {
    const removed = deleteQuery({ data: { id: "old-1" }, error: null });
    const inserted = {
      insert: vi.fn(() => inserted),
      select: vi
        .fn()
        .mockResolvedValue({ data: [{ id: "new-1" }], error: null }),
    };
    const from = vi
      .fn()
      .mockReturnValueOnce(removed)
      .mockReturnValueOnce(inserted);

    await expect(
      replaceRecurringCalendarBlocks(
        { from } as never,
        "user-1",
        "America/Recife",
        "2026-09-14",
        [
          {
            day_of_week: 1,
            end_local: "11:00:00",
            id: "old-1",
            revision: 3,
            start_local: "10:00:00",
            timezone: "America/Recife",
            title: "Academia",
          },
        ],
        [
          {
            day_of_week: 1,
            end_local: "12:00",
            start_local: "11:00",
            title: "Trabalho",
          },
        ],
      ),
    ).resolves.toEqual([{ id: "new-1" }]);

    expect(removed.eq).toHaveBeenNthCalledWith(1, "id", "old-1");
    expect(removed.eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
    expect(removed.eq).toHaveBeenNthCalledWith(3, "revision", 3);
    expect(inserted.insert).toHaveBeenCalledWith([
      {
        day_of_week: 1,
        end_local: "12:00",
        kind: "recurring",
        source: "manual",
        start_local: "11:00",
        timezone: "America/Recife",
        title: "Trabalho",
        user_id: "user-1",
        valid_from: "2026-09-14",
      },
    ]);
  });
});
