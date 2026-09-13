import { describe, expectTypeOf, it } from "vitest";

import type {
  PublicTableInsert,
  PublicTableRow,
  PublicTableUpdate,
} from "./database";

describe("generated database types", () => {
  it("keeps public repository contracts typed without importing Supabase", () => {
    expectTypeOf<PublicTableRow<"activities">["id"]>().toEqualTypeOf<string>();
    expectTypeOf<
      PublicTableInsert<"activities">["title"]
    >().toEqualTypeOf<string>();
    expectTypeOf<PublicTableUpdate<"activities">["revision"]>().toEqualTypeOf<
      number | undefined
    >();
  });
});
