import { describe, expect, it, vi } from "vitest";

import {
  ensureUserPreferences,
  updateUserPreferences,
} from "./user-preferences-repository";

function query(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of [
    "eq",
    "insert",
    "maybeSingle",
    "select",
    "single",
    "update",
  ]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.maybeSingle?.mockResolvedValue(result);
  chain.single?.mockResolvedValue(result);
  return chain;
}

const preferences = {
  capacity_reserve_percent: 20,
  minimum_session_minutes: 25,
  preferred_session_minutes: 50,
  revision: 1,
  user_id: "user-1",
  week_starts_on: 1,
};

describe("SKN-051 preferences repository", () => {
  it("creates missing preferences with database defaults", async () => {
    const missing = query({ data: null, error: null });
    const created = query({ data: preferences, error: null });
    const from = vi
      .fn()
      .mockReturnValueOnce(missing)
      .mockReturnValueOnce(created);

    await expect(
      ensureUserPreferences({ from } as never, "user-1"),
    ).resolves.toEqual(preferences);
    expect(created.insert).toHaveBeenCalledWith({ user_id: "user-1" });
  });

  it("updates only the owner at the expected revision", async () => {
    const updated = query({
      data: { ...preferences, revision: 2 },
      error: null,
    });
    const from = vi.fn(() => updated);
    const input = {
      capacity_reserve_percent: 15,
      minimum_session_minutes: 20,
      preferred_session_minutes: 45,
      week_starts_on: 0,
    };

    await updateUserPreferences({ from } as never, "user-1", 1, input);

    expect(updated.update).toHaveBeenCalledWith(input);
    expect(updated.eq).toHaveBeenNthCalledWith(1, "user_id", "user-1");
    expect(updated.eq).toHaveBeenNthCalledWith(2, "revision", 1);
  });
});
