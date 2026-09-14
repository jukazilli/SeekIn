import { describe, expect, it, vi } from "vitest";

import { ensureProfile, updateOnboardingProgress } from "./profile-repository";

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

const profile = {
  display_name: null,
  onboarding_status: "not_started",
  onboarding_step: 0,
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

describe("SKN-050 onboarding progress repository", () => {
  it("updates only the owner's current revision", async () => {
    const updated = query({
      data: {
        ...profile,
        onboarding_status: "in_progress",
        onboarding_step: 1,
      },
      error: null,
    });
    const from = vi.fn(() => updated);

    await updateOnboardingProgress({ from } as never, "user-1", 3, 1);

    expect(updated.update).toHaveBeenCalledWith({
      onboarding_status: "in_progress",
      onboarding_step: 1,
    });
    expect(updated.eq).toHaveBeenNthCalledWith(1, "user_id", "user-1");
    expect(updated.eq).toHaveBeenNthCalledWith(2, "revision", 3);
  });
});
