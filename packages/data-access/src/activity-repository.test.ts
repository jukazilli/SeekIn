import { describe, expect, it, vi } from "vitest";

import { createSupabaseActivityRepository } from "./activity-repository";

function query(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["eq", "insert", "select", "single", "update"])
    chain[method] = vi.fn(() => chain);
  chain.single?.mockResolvedValue(result);
  return chain;
}

describe("SKN-055 canonical activity repository", () => {
  it("creates an activity and returns the persisted row", async () => {
    const persisted = { id: "activity-1", revision: 1 };
    const created = query({ data: persisted, error: null });
    const repository = createSupabaseActivityRepository({
      from: vi.fn(() => created),
    } as never);
    const input = {
      activity_type: "assignment",
      deadline_at: "2026-09-19T02:59:00Z",
      deadline_has_time: false,
      deadline_local_date: "2026-09-18",
      deadline_local_time: null,
      deadline_timezone: "America/Sao_Paulo",
      estimated_minutes: 100,
      title: "Trabalho final",
      user_id: "user-1",
    };

    await expect(repository.create(input)).resolves.toEqual(persisted);
    expect(created.insert).toHaveBeenCalledWith(input);
  });

  it("updates only the owner, activity and expected revision", async () => {
    const updated = query({
      data: { id: "activity-1", revision: 3 },
      error: null,
    });
    const repository = createSupabaseActivityRepository({
      from: vi.fn(() => updated),
    } as never);

    await repository.update("user-1", "activity-1", 2, {
      estimated_minutes: 120,
    });

    expect(updated.update).toHaveBeenCalledWith({ estimated_minutes: 120 });
    expect(updated.eq).toHaveBeenNthCalledWith(1, "user_id", "user-1");
    expect(updated.eq).toHaveBeenNthCalledWith(2, "id", "activity-1");
    expect(updated.eq).toHaveBeenNthCalledWith(3, "revision", 2);
  });
});
