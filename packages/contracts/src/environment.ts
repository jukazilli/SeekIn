import { z } from "zod";

export const appEnvironmentSchema = z.enum([
  "local",
  "preview",
  "beta",
  "production",
]);

export const clientEnvironmentSchema = z
  .object({
    APP_ENV: appEnvironmentSchema,
    APP_VERSION: z.string().trim().min(1),
    VITE_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
    VITE_SUPABASE_URL: z.url(),
  })
  .strict();

export const serverEnvironmentSchema = z
  .object({
    APP_ENV: appEnvironmentSchema,
    APP_VERSION: z.string().trim().min(1),
    SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
    SUPABASE_URL: z.url(),
  })
  .strict();

export type ClientEnvironment = z.infer<typeof clientEnvironmentSchema>;
export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;
