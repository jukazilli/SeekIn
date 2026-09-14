import { describe, expect, it, vi } from "vitest";

import { ensureProfile } from "./profile-repository";

function query(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["eq", "insert", "maybeSingle", "select", "single"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.maybeSingle?.mockResolvedValue(result);
  chain.single?.mockResolvedValue(result);
  return chain;
}

const profile = {
  display_name: null,
  revision: 1,
  timezone: "America/Sao_Paulo",
  user_id: "user-1",
};

describe("SKN-044 profile repository", () => {
  it("returns an existing profile without creating another", async () => {
    const existing = query({ data: profile, error: null });
    const from = vi.fn(() => existing);
    await expect(ensureProfile({ from } as never, "user-1")).resolves.toEqual(
      profile,
    );
    expect(existing.insert).not.toHaveBeenCalled();
  });

  it("creates a missing profile exactly for the authenticated user", async () => {
    const missing = query({ data: null, error: null });
    const created = query({ data: profile, error: null });
    const from = vi
      .fn()
      .mockReturnValueOnce(missing)
      .mockReturnValueOnce(created);
    await expect(ensureProfile({ from } as never, "user-1")).resolves.toEqual(
      profile,
    );
    expect(created.insert).toHaveBeenCalledWith({ user_id: "user-1" });
  });

  it("recovers when a concurrent request wins profile creation", async () => {
    const missing = query({ data: null, error: null });
    const duplicate = query({ data: null, error: { code: "23505" } });
    const raced = query({ data: profile, error: null });
    const from = vi
      .fn()
      .mockReturnValueOnce(missing)
      .mockReturnValueOnce(duplicate)
      .mockReturnValueOnce(raced);
    await expect(ensureProfile({ from } as never, "user-1")).resolves.toEqual(
      profile,
    );
  });
});
