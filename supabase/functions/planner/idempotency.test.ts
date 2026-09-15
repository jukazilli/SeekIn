import { describe, expect, it } from "vitest";

import { createIdempotencyContext } from "./idempotency";

describe("planner idempotency context", () => {
  it("hashes the key and normalized request without retaining the raw key", async () => {
    const first = await createIdempotencyContext(
      "11000000-0000-4000-8000-000000000092",
      { reason: "manual_request", contractVersion: 1 },
    );
    const reordered = await createIdempotencyContext(
      "11000000-0000-4000-8000-000000000092",
      { contractVersion: 1, reason: "manual_request" },
    );

    expect(first).toEqual(reordered);
    expect(first?.keyHash).toMatch(/^[0-9a-f]{64}$/);
    expect(first?.requestHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(first)).not.toContain("11000000-0000");
  });

  it.each([null, "", "not-a-uuid", "11000000-0000-0000-0000-000000000092"])(
    "rejects a missing or invalid key: %s",
    async (key) => {
      await expect(createIdempotencyContext(key, {})).resolves.toBeNull();
    },
  );
});
