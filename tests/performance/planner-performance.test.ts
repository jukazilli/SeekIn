import os from "node:os";
import { performance } from "node:perf_hooks";

import { describe, expect, it } from "vitest";

import {
  PLANNER_CORE_CONTRACT_VERSION,
  PLANNER_CORE_VERSION,
  PLANNER_RULES_VERSION,
  diagnosePlan,
  type PlannerInput,
} from "../../packages/planner-core/src";
import { buildStressFixture } from "../../packages/planner-core/test/fixtures/planner-fixtures";

const SAMPLE_COUNT = 20;
const WARMUP_COUNT = 3;
const P95_BUDGET_MS = 3_000;
const DATASET_SEED = "FX-STRESS-005";

function benchmarkInput(): PlannerInput {
  const fixture = buildStressFixture(200);
  const activities = fixture.activities as Array<{
    id: string;
    deadlineAt: string;
    estimatedMinutes: number;
    priority: number;
  }>;

  return {
    contractVersion: PLANNER_CORE_CONTRACT_VERSION,
    plannerVersion: PLANNER_CORE_VERSION,
    rulesVersion: PLANNER_RULES_VERSION,
    generatedAt: fixture.now,
    timezone: fixture.timezone,
    horizonStartDate: "2026-09-14",
    horizonEndDate: "2026-12-12",
    preferences: fixture.preferences,
    availability: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      id: `55000000-0000-4000-8000-${(dayOfWeek + 1)
        .toString(16)
        .padStart(12, "0")}`,
      dayOfWeek,
      startLocal: "08:00:00",
      endLocal: "20:00:00",
    })),
    blocks: [],
    activities: activities.map((activity, index) => ({
      id: activity.id,
      deadlineAt: activity.deadlineAt,
      remainingMinutes: activity.estimatedMinutes,
      priority: activity.priority,
      status: index % 7 === 0 ? "in_progress" : "not_started",
      createdAt: new Date(
        Date.parse(fixture.now) - (index % 30) * 86_400_000,
      ).toISOString(),
      dependencyIds: [],
    })),
    protectedSessions: [],
  };
}

function percentile(sorted: number[], percentileValue: number): number {
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)]!;
}

describe("PERF planner-core — RNF-001", () => {
  it("gera 200 atividades em 90 dias com p95 abaixo de 3 segundos", () => {
    const input = benchmarkInput();

    for (let index = 0; index < WARMUP_COUNT; index += 1) {
      diagnosePlan(input);
    }

    const samples = Array.from({ length: SAMPLE_COUNT }, () => {
      const start = performance.now();
      const result = diagnosePlan(input);
      const elapsed = performance.now() - start;
      expect(
        result.sessions.length + result.unallocated.length,
      ).toBeGreaterThan(0);
      return elapsed;
    }).sort((left, right) => left - right);
    const report = {
      benchmark: "RNF-001",
      dataset: DATASET_SEED,
      activityCount: input.activities.length,
      horizonDays: 90,
      warmups: WARMUP_COUNT,
      samples: SAMPLE_COUNT,
      p50Ms: Number(percentile(samples, 50).toFixed(2)),
      p95Ms: Number(percentile(samples, 95).toFixed(2)),
      budgetMs: P95_BUDGET_MS,
      plannerVersion: PLANNER_CORE_VERSION,
      rulesVersion: PLANNER_RULES_VERSION,
      node: process.version,
      platform: `${os.platform()} ${os.release()} ${os.arch()}`,
      cpu: os.cpus()[0]?.model ?? "unknown",
      logicalCpus: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
    };

    process.stdout.write(`\nPERFORMANCE_REPORT ${JSON.stringify(report)}\n`);
    expect(report.p95Ms).toBeLessThan(P95_BUDGET_MS);
  });
});
