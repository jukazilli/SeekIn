import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  FIXTURE_USER_IDS,
  buildCanonicalFixtures,
  buildStressFixture,
} from "./planner-fixtures";

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

describe("UT fixtures — famílias sintéticas canônicas", () => {
  it("materializa as seis famílias com relógio e regras fixos", () => {
    const fixtures = buildCanonicalFixtures();

    expect(fixtures.map(({ fixtureId }) => fixtureId)).toEqual([
      "FX-BASE-001",
      "FX-USERS-002",
      "FX-PLAN-003",
      "FX-OFFLINE-004",
      "FX-STRESS-005",
      "FX-DST-006",
    ]);
    expect(fixtures.every(({ contractVersion }) => contractVersion === 1)).toBe(
      true,
    );
    expect(fixtures.every(({ now }) => now === "2026-09-14T12:00:00Z")).toBe(
      true,
    );
  });

  it("produz conteúdo byte a byte determinístico", () => {
    const first = buildCanonicalFixtures();
    const second = buildCanonicalFixtures();

    expect(second).toEqual(first);
    expect(digest(second)).toBe(digest(first));
  });

  it("mantém identidades sintéticas disjuntas", () => {
    expect(FIXTURE_USER_IDS.userA).not.toBe(FIXTURE_USER_IDS.userB);
    expect(JSON.stringify(buildCanonicalFixtures())).not.toContain(
      "@gmail.com",
    );
  });

  it("gera a carga de 200 atividades somente sob demanda", () => {
    const fixture = buildStressFixture();
    const ids = fixture.activities.map(
      (activity) => (activity as { id: string }).id,
    );

    expect(fixture.activities).toHaveLength(200);
    expect(new Set(ids)).toHaveLength(200);
    expect(() => buildStressFixture(0)).toThrow(RangeError);
  });
});
