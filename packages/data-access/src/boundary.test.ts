import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";

import { describe, expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : [".ts", ".tsx"].includes(extname(entry.name))
        ? [path]
        : [];
  });
}

describe("Supabase boundary", () => {
  it("keeps Supabase imports out of domain and React components", () => {
    const protectedRoots = ["packages/domain/src", "apps/web/app"].map((path) =>
      join(process.cwd(), path),
    );

    for (const file of protectedRoots.flatMap(sourceFiles)) {
      expect(readFileSync(file, "utf8"), file).not.toContain(
        "@supabase/supabase-js",
      );
    }
  });
});
