import { z } from "zod";

const instantSchema = z.iso.datetime({ offset: true });
const riskSchema = z
  .object({
    activityId: z.uuid(),
    level: z.enum([
      "controlled",
      "attention",
      "critical",
      "infeasible",
      "overdue",
    ]),
    slackMinutes: z.int(),
    loadRate: z.union([z.number().nonnegative(), z.literal("infinite")]),
  })
  .strict();

export const currentPlanProjectionSchema = z
  .object({
    contractVersion: z.literal(1),
    plan: z
      .object({
        planId: z.uuid(),
        version: z.int().positive(),
        status: z.literal("published"),
        feasibility: z.enum(["feasible", "partial", "infeasible"]),
        timezone: z.string().min(1),
        horizonStartDate: z.iso.date(),
        horizonEndDate: z.iso.date(),
        plannerVersion: z.string().min(1),
        rulesVersion: z.string().min(1),
        publishedAt: instantSchema,
      })
      .strict(),
    capacity: z
      .object({
        grossMinutes: z.int().nonnegative(),
        operationalMinutes: z.int().nonnegative(),
        netMinutes: z.int().nonnegative(),
        allocatedMinutes: z.int().nonnegative(),
        balanceMinutes: z.int(),
      })
      .strict()
      .nullable(),
    activities: z.array(
      z
        .object({
          activityId: z.uuid(),
          title: z.string().min(1),
          disciplineId: z.uuid().nullable(),
          deadlineAt: instantSchema,
          status: z.string().min(1),
          estimatedMinutes: z.int().positive(),
          actualMinutes: z.int().nonnegative(),
          progressPercent: z.int().min(0).max(100),
          risk: riskSchema.nullable(),
        })
        .strict(),
    ),
    sessions: z.array(
      z
        .object({
          sessionId: z.uuid(),
          activityId: z.uuid(),
          startsAt: instantSchema,
          endsAt: instantSchema,
          plannedMinutes: z.int().positive(),
          status: z.enum([
            "scheduled",
            "in_progress",
            "completed",
            "skipped",
            "cancelled",
          ]),
          isPinned: z.boolean(),
          source: z.enum(["automatic", "manual"]),
          rationaleCode: z.string().min(1),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((projection, context) => {
    if (
      projection.capacity &&
      projection.capacity.balanceMinutes !==
        projection.capacity.netMinutes - projection.capacity.allocatedMinutes
    ) {
      context.addIssue({
        code: "custom",
        message:
          "O saldo deve corresponder à capacidade líquida menos a alocada",
        path: ["capacity", "balanceMinutes"],
      });
    }

    const activityIds = new Set(
      projection.activities.map(({ activityId }) => activityId),
    );
    for (const [index, activity] of projection.activities.entries()) {
      if (activity.risk && activity.risk.activityId !== activity.activityId) {
        context.addIssue({
          code: "custom",
          message: "O risco deve pertencer à mesma atividade",
          path: ["activities", index, "risk", "activityId"],
        });
      }
    }
    for (const [index, session] of projection.sessions.entries()) {
      if (!activityIds.has(session.activityId)) {
        context.addIssue({
          code: "custom",
          message: "A sessão deve referenciar uma atividade da mesma projeção",
          path: ["sessions", index, "activityId"],
        });
      }
      if (Date.parse(session.startsAt) >= Date.parse(session.endsAt)) {
        context.addIssue({
          code: "custom",
          message: "A sessão deve terminar depois do início",
          path: ["sessions", index, "endsAt"],
        });
      }
    }
  });

export type CurrentPlanProjection = z.infer<typeof currentPlanProjectionSchema>;
