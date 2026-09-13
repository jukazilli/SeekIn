import { z } from "zod";

export const healthResponseSchema = z.object({
  code: z.enum(["HEALTH_OK", "AUTH_REQUIRED", "DEPENDENCY_UNAVAILABLE"]),
  correlationId: z.string().trim().min(1),
  service: z.enum(["seekin-web", "seekin-backend"]),
  status: z.enum(["up", "down"]),
  version: z.string().trim().min(1),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export function createHealthResponse(
  input: Pick<HealthResponse, "correlationId" | "service"> &
    Partial<Pick<HealthResponse, "version">>,
): HealthResponse {
  return healthResponseSchema.parse({
    ...input,
    code: "HEALTH_OK",
    status: "up",
    version: input.version ?? "0.1.0",
  });
}
