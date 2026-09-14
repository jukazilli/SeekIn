import { describe, expect, it, vi } from "vitest";

import { saveOnboardingDiscipline } from "./disciplines-repository";

function query(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["eq", "insert", "maybeSingle", "select", "update"])
    chain[method] = vi.fn(() => chain);
  chain.maybeSingle?.mockResolvedValue(result);
  return chain;
}

describe("SKN-054 disciplines repository", () => {
  it("creates the first discipline for the authenticated owner", async () => {
    const created = query({
      data: { id: "discipline-1", name: "Cálculo I" },
      error: null,
    });
    const from = vi.fn(() => created);

    await saveOnboardingDiscipline(
      { from } as never,
      "user-1",
      null,
      "Cálculo I",
    );

    expect(created.insert).toHaveBeenCalledWith({
      name: "Cálculo I",
      user_id: "user-1",
    });
  });

  it("updates a resumed discipline only by owner and revision", async () => {
    const updated = query({
      data: { id: "discipline-1", name: "Física" },
      error: null,
    });
    const from = vi.fn(() => updated);

    await saveOnboardingDiscipline(
      { from } as never,
      "user-1",
      {
        color_key: null,
        description: null,
        id: "discipline-1",
        name: "Cálculo I",
        revision: 2,
      },
      "Física",
    );

    expect(updated.update).toHaveBeenCalledWith({ name: "Física" });
    expect(updated.eq).toHaveBeenNthCalledWith(1, "id", "discipline-1");
    expect(updated.eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
    expect(updated.eq).toHaveBeenNthCalledWith(3, "revision", 2);
  });
});
