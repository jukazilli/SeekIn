export type PlannerFixture = {
  fixtureId: string;
  contractVersion: 1;
  rulesVersion: string;
  now: string;
  timezone: string;
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  preferences: {
    preferredSessionMinutes: number;
    minimumSessionMinutes: number;
    reservePercent: number;
    dailyLimitMinutes: number;
  };
  availability: unknown[];
  blocks: unknown[];
  activities: unknown[];
  protectedSessions: unknown[];
  expected: unknown;
};

const BASE = {
  contractVersion: 1 as const,
  rulesVersion: "planner-rules-v1",
  now: "2026-09-14T12:00:00Z",
  timezone: "America/Sao_Paulo",
  weekStartsOn: 1 as const,
  preferences: {
    preferredSessionMinutes: 50,
    minimumSessionMinutes: 25,
    reservePercent: 20,
    dailyLimitMinutes: 240,
  },
};

export const FIXTURE_USER_IDS = {
  userA: "11000000-0000-4000-8000-000000000001",
  userB: "22000000-0000-4000-8000-000000000002",
} as const;

export function buildBaseFixture(): PlannerFixture {
  return {
    ...BASE,
    fixtureId: "FX-BASE-001",
    availability: [
      {
        id: "11000000-0000-4000-8000-000000000011",
        userId: FIXTURE_USER_IDS.userA,
        dayOfWeek: 1,
        startLocal: "18:00:00",
        endLocal: "20:00:00",
      },
    ],
    blocks: [],
    activities: [
      {
        id: "11000000-0000-4000-8000-000000000021",
        userId: FIXTURE_USER_IDS.userA,
        title: "Atividade A",
        deadlineAt: "2026-09-19T02:59:00Z",
        estimatedMinutes: 50,
        actualMinutes: 0,
      },
    ],
    protectedSessions: [],
    expected: {
      feasibility: "feasible",
      plannedMinutes: 50,
      sessionCount: 1,
    },
  };
}

export function buildUsersFixture(): PlannerFixture {
  return {
    ...BASE,
    fixtureId: "FX-USERS-002",
    availability: [
      {
        userId: FIXTURE_USER_IDS.userA,
        dayOfWeek: 1,
        startLocal: "18:00:00",
        endLocal: "20:00:00",
      },
      {
        userId: FIXTURE_USER_IDS.userB,
        dayOfWeek: 2,
        startLocal: "19:00:00",
        endLocal: "21:00:00",
      },
    ],
    blocks: [],
    activities: [
      {
        id: "11000000-0000-4000-8000-000000000022",
        userId: FIXTURE_USER_IDS.userA,
        title: "Atividade A",
      },
      {
        id: "22000000-0000-4000-8000-000000000022",
        userId: FIXTURE_USER_IDS.userB,
        title: "Atividade B",
      },
    ],
    protectedSessions: [],
    expected: {
      userAVisibleActivityIds: ["11000000-0000-4000-8000-000000000022"],
      userBVisibleActivityIds: ["22000000-0000-4000-8000-000000000022"],
    },
  };
}

export function buildPlanFixture(): PlannerFixture {
  return {
    ...BASE,
    fixtureId: "FX-PLAN-003",
    availability: [],
    blocks: [],
    activities: [
      {
        id: "11000000-0000-4000-8000-000000000023",
        userId: FIXTURE_USER_IDS.userA,
        title: "Atividade do plano",
        estimatedMinutes: 100,
      },
    ],
    protectedSessions: [
      {
        id: "11000000-0000-4000-8000-000000000041",
        activityId: "11000000-0000-4000-8000-000000000023",
        isPinned: true,
        plannedStartAt: "2026-09-14T21:00:00Z",
        plannedEndAt: "2026-09-14T21:50:00Z",
      },
    ],
    expected: {
      currentPlanId: "11000000-0000-4000-8000-000000000031",
      proposalPlanId: "11000000-0000-4000-8000-000000000032",
      preservedSessionIds: ["11000000-0000-4000-8000-000000000041"],
    },
  };
}

export function buildOfflineFixture(): PlannerFixture {
  return {
    ...BASE,
    fixtureId: "FX-OFFLINE-004",
    availability: [],
    blocks: [],
    activities: [],
    protectedSessions: [],
    expected: {
      userId: FIXTURE_USER_IDS.userA,
      lastPublishedPlanId: "11000000-0000-4000-8000-000000000031",
      synchronizedAt: "2026-09-14T11:55:00Z",
      offlineReadAllowed: true,
    },
  };
}

export function buildStressFixture(activityCount = 200): PlannerFixture {
  if (
    !Number.isInteger(activityCount) ||
    activityCount < 1 ||
    activityCount > 1_000
  ) {
    throw new RangeError("activityCount deve ser um inteiro entre 1 e 1000");
  }

  const activities = Array.from({ length: activityCount }, (_, index) => {
    const ordinal = index + 1;
    const dayOffset = index % 90;
    const deadline = new Date("2026-09-15T02:59:00Z");
    deadline.setUTCDate(deadline.getUTCDate() + dayOffset);

    return {
      id: `55000000-0000-4000-8000-${ordinal.toString(16).padStart(12, "0")}`,
      userId: FIXTURE_USER_IDS.userA,
      title: `Atividade sintética ${ordinal.toString().padStart(3, "0")}`,
      deadlineAt: deadline.toISOString(),
      estimatedMinutes: 25 + (index % 4) * 25,
      priority: index % 5,
    };
  });

  return {
    ...BASE,
    fixtureId: "FX-STRESS-005",
    availability: [],
    blocks: [],
    activities,
    protectedSessions: [],
    expected: {
      activityCount,
      horizonDays: 90,
    },
  };
}

export function buildDstFixture(): PlannerFixture {
  return {
    ...BASE,
    fixtureId: "FX-DST-006",
    timezone: "America/New_York",
    availability: [],
    blocks: [
      {
        civilTime: "2026-03-08T02:30:00",
        expectedDiagnostic: "NONEXISTENT_LOCAL_TIME",
      },
      {
        civilTime: "2026-11-01T01:30:00",
        expectedDiagnostic: "AMBIGUOUS_LOCAL_TIME",
      },
    ],
    activities: [],
    protectedSessions: [],
    expected: {
      silentCorrectionAllowed: false,
      diagnosticCount: 2,
    },
  };
}

export function buildCanonicalFixtures(): PlannerFixture[] {
  return [
    buildBaseFixture(),
    buildUsersFixture(),
    buildPlanFixture(),
    buildOfflineFixture(),
    buildStressFixture(),
    buildDstFixture(),
  ];
}
