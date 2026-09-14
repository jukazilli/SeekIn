import { z } from "zod";

import {
  PLANNER_CORE_CONTRACT_VERSION,
  PLANNER_CORE_VERSION,
  PLANNER_RULES_VERSION,
} from "./planner-version";

const uuidSchema = z.uuid();
const instantSchema = z.iso.datetime({ offset: true });
const dateSchema = z.iso.date();
const localTimeSchema = z.iso.time({ precision: 0 });
const positiveMinutesSchema = z.int().positive();
const nonNegativeMinutesSchema = z.int().nonnegative();
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

function intervalIsOrdered(start: string, end: string): boolean {
  return new Date(start).getTime() < new Date(end).getTime();
}

function localIntervalIsOrdered(start: string, end: string): boolean {
  return start < end;
}

function isKnownTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const plannerTimeZoneSchema = z.string().trim().refine(isKnownTimeZone, {
  message: "Fuso horário IANA inválido",
});

export const plannerPreferencesSchema = z
  .object({
    preferredSessionMinutes: z.int().min(15).max(240),
    minimumSessionMinutes: z.int().min(10).max(120),
    reservePercent: z.number().min(0).max(80),
    dailyLimitMinutes: z.int().min(15).max(1_440),
  })
  .strict()
  .refine(
    ({ minimumSessionMinutes, preferredSessionMinutes }) =>
      minimumSessionMinutes <= preferredSessionMinutes,
    {
      message: "A sessão mínima não pode superar a sessão preferida",
      path: ["minimumSessionMinutes"],
    },
  );

export const plannerAvailabilitySchema = z
  .object({
    id: uuidSchema,
    dayOfWeek: z.int().min(0).max(6),
    startLocal: localTimeSchema,
    endLocal: localTimeSchema,
  })
  .strict()
  .refine(
    ({ startLocal, endLocal }) => localIntervalIsOrdered(startLocal, endLocal),
    {
      message: "A disponibilidade deve terminar depois do início",
      path: ["endLocal"],
    },
  );

export const plannerBlockSchema = z
  .object({
    id: uuidSchema,
    startsAt: instantSchema,
    endsAt: instantSchema,
    kind: z.enum(["recurring_commitment", "calendar_block"]),
  })
  .strict()
  .refine(({ startsAt, endsAt }) => intervalIsOrdered(startsAt, endsAt), {
    message: "O bloqueio deve terminar depois do início",
    path: ["endsAt"],
  });

export const plannerActivitySchema = z
  .object({
    id: uuidSchema,
    deadlineAt: instantSchema,
    remainingMinutes: positiveMinutesSchema,
    priority: z.int().min(0).max(4),
    status: z.enum(["not_started", "in_progress"]),
    createdAt: instantSchema,
    dependencyIds: z.array(uuidSchema).max(200).default([]),
  })
  .strict()
  .refine(({ dependencyIds, id }) => !dependencyIds.includes(id), {
    message: "Uma atividade não pode depender dela mesma",
    path: ["dependencyIds"],
  });

export const protectedSessionSchema = z
  .object({
    id: uuidSchema,
    activityId: uuidSchema,
    startsAt: instantSchema,
    endsAt: instantSchema,
    actualMinutes: nonNegativeMinutesSchema,
    protection: z.enum(["completed", "in_progress", "pinned", "manual"]),
  })
  .strict()
  .refine(({ startsAt, endsAt }) => intervalIsOrdered(startsAt, endsAt), {
    message: "A sessão protegida deve terminar depois do início",
    path: ["endsAt"],
  });

export const plannerInputSchema = z
  .object({
    contractVersion: z.literal(PLANNER_CORE_CONTRACT_VERSION),
    plannerVersion: z.literal(PLANNER_CORE_VERSION),
    rulesVersion: z.literal(PLANNER_RULES_VERSION),
    generatedAt: instantSchema,
    timezone: plannerTimeZoneSchema,
    horizonStartDate: dateSchema,
    horizonEndDate: dateSchema,
    preferences: plannerPreferencesSchema,
    availability: z.array(plannerAvailabilitySchema).max(70),
    blocks: z.array(plannerBlockSchema).max(2_000),
    activities: z.array(plannerActivitySchema).max(200),
    protectedSessions: z.array(protectedSessionSchema).max(2_000),
  })
  .strict()
  .superRefine((input, context) => {
    const start = new Date(`${input.horizonStartDate}T00:00:00Z`);
    const end = new Date(`${input.horizonEndDate}T00:00:00Z`);
    const horizonDays =
      Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

    if (horizonDays < 1 || horizonDays > 90) {
      context.addIssue({
        code: "custom",
        message: "O horizonte deve conter entre 1 e 90 dias",
        path: ["horizonEndDate"],
      });
    }

    const activityIds = new Set(input.activities.map(({ id }) => id));
    for (const [index, session] of input.protectedSessions.entries()) {
      if (!activityIds.has(session.activityId)) {
        context.addIssue({
          code: "custom",
          message: "A sessão protegida referencia uma atividade ausente",
          path: ["protectedSessions", index, "activityId"],
        });
      }
    }
  });

const rationaleCodeSchema = z.enum([
  "overdue",
  "infeasible_horizon",
  "earliest_deadline",
  "lowest_slack",
  "manual_priority",
  "already_started",
  "oldest_activity",
]);

export const proposedSessionSchema = z
  .object({
    sessionId: uuidSchema,
    activityId: uuidSchema,
    startsAt: instantSchema,
    endsAt: instantSchema,
    plannedMinutes: positiveMinutesSchema,
    changeKind: z.enum(["created", "kept", "moved"]),
    rationaleCode: rationaleCodeSchema,
  })
  .strict()
  .refine(({ startsAt, endsAt }) => intervalIsOrdered(startsAt, endsAt), {
    message: "A sessão proposta deve terminar depois do início",
    path: ["endsAt"],
  });

export const plannerConflictSchema = z
  .object({
    code: z.enum(["insufficient_capacity", "protected_capacity"]),
    firstAffectedDeadlineAt: instantSchema,
    deficitMinutes: positiveMinutesSchema,
    largestAvailableWindowMinutes: nonNegativeMinutesSchema,
    activityIds: z.array(uuidSchema).min(1).max(200),
  })
  .strict();

export const plannerOutputSchema = z
  .object({
    contractVersion: z.literal(PLANNER_CORE_CONTRACT_VERSION),
    plannerVersion: z.literal(PLANNER_CORE_VERSION),
    rulesVersion: z.literal(PLANNER_RULES_VERSION),
    feasibility: z.enum(["feasible", "partial", "infeasible"]),
    requiresConfirmation: z.literal(true),
    capacity: z
      .object({
        grossMinutes: nonNegativeMinutesSchema,
        operationalMinutes: nonNegativeMinutesSchema,
        netMinutes: nonNegativeMinutesSchema,
        allocatedMinutes: nonNegativeMinutesSchema,
      })
      .strict(),
    sessions: z.array(proposedSessionSchema).max(2_000),
    activityRisks: z.array(
      z
        .object({
          activityId: uuidSchema,
          level: z.enum([
            "controlled",
            "attention",
            "critical",
            "infeasible",
            "overdue",
          ]),
          slackMinutes: z.int(),
          loadRate: z.number().nonnegative(),
        })
        .strict(),
    ),
    unallocated: z.array(
      z
        .object({
          activityId: uuidSchema,
          minutes: positiveMinutesSchema,
        })
        .strict(),
    ),
    conflicts: z.array(plannerConflictSchema),
    changes: z
      .object({
        created: nonNegativeMinutesSchema,
        kept: nonNegativeMinutesSchema,
        moved: nonNegativeMinutesSchema,
        removed: nonNegativeMinutesSchema,
      })
      .strict(),
    inputHash: sha256Schema,
    outputHash: sha256Schema,
  })
  .strict()
  .superRefine((output, context) => {
    if (
      output.feasibility === "feasible" &&
      (output.conflicts.length > 0 || output.unallocated.length > 0)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Um plano viável não pode conter conflitos ou esforço não alocado",
        path: ["feasibility"],
      });
    }
    if (output.feasibility !== "feasible" && output.conflicts.length === 0) {
      context.addIssue({
        code: "custom",
        message:
          "Um plano parcial ou inviável deve explicar ao menos um conflito",
        path: ["conflicts"],
      });
    }
    if (
      output.capacity.netMinutes > output.capacity.operationalMinutes ||
      output.capacity.operationalMinutes > output.capacity.grossMinutes
    ) {
      context.addIssue({
        code: "custom",
        message: "A capacidade deve respeitar bruto >= operacional >= líquido",
        path: ["capacity"],
      });
    }
  });

export type PlannerInput = z.infer<typeof plannerInputSchema>;
export type PlannerOutput = z.infer<typeof plannerOutputSchema>;
