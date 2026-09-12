import { describe, expect, it } from "vitest";

import {
  clientEnvironmentSchema,
  serverEnvironmentSchema,
} from "./environment";

const clientEnvironment = {
  APP_ENV: "local",
  APP_VERSION: "0.1.0",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  VITE_SUPABASE_URL: "http://127.0.0.1:54321",
} as const;

describe("environment contracts", () => {
  it("accepts the explicit client contract", () => {
    expect(clientEnvironmentSchema.parse(clientEnvironment)).toEqual(
      clientEnvironment,
    );
  });

  it("rejects server-only variables in the browser contract", () => {
    expect(() =>
      clientEnvironmentSchema.parse({
        ...clientEnvironment,
        SUPABASE_SECRET_KEY: "must-not-reach-the-browser",
      }),
    ).toThrow();
  });

  it("rejects a missing server configuration", () => {
    expect(() =>
      serverEnvironmentSchema.parse({
        APP_ENV: "local",
        APP_VERSION: "0.1.0",
      }),
    ).toThrow();
  });
});
