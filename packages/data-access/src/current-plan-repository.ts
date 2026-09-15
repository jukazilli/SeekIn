import type { Json } from "@seekin/contracts";
import {
  currentPlanProjectionSchema,
  type CurrentPlanProjection,
} from "@seekin/contracts";

export class CurrentPlanRepositoryError extends Error {
  readonly code = "CURRENT_PLAN_UNAVAILABLE";

  constructor() {
    super("The current plan could not be loaded.");
    this.name = "CurrentPlanRepositoryError";
  }
}

export interface CurrentPlanRpcClient {
  rpc(name: "read_current_plan"): PromiseLike<{
    data: Json | null;
    error: { message: string } | null;
  }>;
}

export interface CurrentPlanRepository {
  read(): Promise<CurrentPlanProjection | null>;
}

export function createCurrentPlanRepository(
  client: CurrentPlanRpcClient,
): CurrentPlanRepository {
  return {
    async read() {
      const { data, error } = await client.rpc("read_current_plan");
      if (error) throw new CurrentPlanRepositoryError();
      if (data === null) return null;

      const projection = currentPlanProjectionSchema.safeParse(data);
      if (!projection.success) throw new CurrentPlanRepositoryError();
      return projection.data;
    },
  };
}
