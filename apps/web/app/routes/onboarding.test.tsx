import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createSupabaseActivityRepository,
  ensureProfile,
  ensureUserPreferences,
  listActiveDisciplines,
  listRecurringCalendarBlocks,
  listActiveAvailabilityWindows,
  replaceRecurringCalendarBlocks,
  saveOnboardingDiscipline,
  replaceActiveAvailabilityWindows,
  updateOnboardingProgress,
  updateProfile,
  updateUserPreferences,
} from "@seekin/data-access";

import { createRequestSessionClient } from "../auth/runtime-auth";
import { action, loader } from "./onboarding";

vi.mock("../auth/runtime-auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../auth/runtime-auth")>()),
  createRequestSessionClient: vi.fn(),
}));
vi.mock("@seekin/data-access", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@seekin/data-access")>()),
  createSupabaseActivityRepository: vi.fn(),
  ensureProfile: vi.fn(),
  ensureUserPreferences: vi.fn(),
  listActiveDisciplines: vi.fn(),
  listRecurringCalendarBlocks: vi.fn(),
  listActiveAvailabilityWindows: vi.fn(),
  replaceRecurringCalendarBlocks: vi.fn(),
  saveOnboardingDiscipline: vi.fn(),
  replaceActiveAvailabilityWindows: vi.fn(),
  updateOnboardingProgress: vi.fn(),
  updateProfile: vi.fn(),
  updateUserPreferences: vi.fn(),
}));

const mockedSessionClient = vi.mocked(createRequestSessionClient);
const mockedActivityRepository = vi.mocked(createSupabaseActivityRepository);
const mockedEnsureProfile = vi.mocked(ensureProfile);
const mockedEnsurePreferences = vi.mocked(ensureUserPreferences);
const mockedListDisciplines = vi.mocked(listActiveDisciplines);
const mockedListRecurring = vi.mocked(listRecurringCalendarBlocks);
const mockedListAvailability = vi.mocked(listActiveAvailabilityWindows);
const mockedReplaceRecurring = vi.mocked(replaceRecurringCalendarBlocks);
const mockedSaveDiscipline = vi.mocked(saveOnboardingDiscipline);
const mockedReplaceAvailability = vi.mocked(replaceActiveAvailabilityWindows);
const mockedUpdateProgress = vi.mocked(updateOnboardingProgress);
const mockedUpdateProfile = vi.mocked(updateProfile);
const mockedUpdatePreferences = vi.mocked(updateUserPreferences);

const profile = {
  display_name: null,
  onboarding_status: "in_progress",
  onboarding_step: 1,
  revision: 4,
  timezone: "America/Sao_Paulo",
  user_id: "user-1",
};

const preferences = {
  capacity_reserve_percent: 20,
  minimum_session_minutes: 25,
  preferred_session_minutes: 50,
  revision: 1,
  user_id: "user-1",
  week_starts_on: 1,
};

function state(revision = 4, step = 1) {
  return {
    activity: null,
    availability: [],
    discipline: null,
    disciplines: [],
    operationKey: expect.any(String),
    proposal: null,
    recurringBlocks: [],
    preferences: {
      capacity_reserve_percent: 20,
      minimum_session_minutes: 25,
      preferred_session_minutes: 50,
      revision: 1,
      week_starts_on: 1,
    },
    revision,
    step,
    timezone: "America/Sao_Paulo",
  };
}

let plannerInvoke: ReturnType<typeof vi.fn>;

function authenticatedClient() {
  plannerInvoke = vi.fn().mockResolvedValue({
    data: {
      data: {
        capacity: {
          allocatedMinutes: 100,
          grossMinutes: 300,
          netMinutes: 240,
          operationalMinutes: 300,
        },
        conflicts: [],
        feasibility: "feasible",
        planId: "95000000-0000-4000-8000-000000000056",
        requiresConfirmation: true,
        sessions: [],
        status: "proposal",
        unallocated: [],
        version: 1,
      },
    },
    error: null,
  });
  const client = {};
  Object.defineProperty(client, "functions", {
    enumerable: false,
    value: { invoke: plannerInvoke },
  });
  mockedSessionClient.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      }),
    } as never,
    client: client as never,
    headers: new Headers({ "cache-control": "private, no-store" }),
  });
}

function args(request: Request) {
  return { context: {}, params: {}, request } as never;
}

describe("SKN-050 persistent onboarding route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticatedClient();
    mockedEnsureProfile.mockResolvedValue(profile);
    mockedEnsurePreferences.mockResolvedValue(preferences);
    mockedListDisciplines.mockResolvedValue([]);
    mockedActivityRepository.mockReturnValue({
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    });
    mockedListAvailability.mockResolvedValue([]);
    mockedListRecurring.mockResolvedValue([]);
  });

  it("resumes the last server-confirmed step", async () => {
    const response = (await loader(
      args(new Request("https://seekin.example.test/onboarding")),
    )) as Response;

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(state());
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("persists a one-step move for the verified owner", async () => {
    mockedEnsureProfile.mockResolvedValue({
      ...profile,
      onboarding_status: "not_started",
      onboarding_step: 0,
    });
    mockedUpdateProgress.mockResolvedValue({
      ...profile,
      onboarding_step: 1,
      revision: 5,
    });
    const request = new Request("https://seekin.example.test/onboarding", {
      body: new URLSearchParams({
        currentStep: "0",
        intent: "next",
        revision: "4",
      }),
      headers: { origin: "https://seekin.example.test" },
      method: "POST",
    });

    const response = (await action(args(request))) as Response;

    expect(mockedUpdateProgress).toHaveBeenCalledWith({}, "user-1", 4, 1);
    await expect(response.json()).resolves.toEqual(state(5, 1));
  });

  it("saves valid preferences before advancing to availability", async () => {
    mockedUpdateProfile.mockResolvedValue({
      ...profile,
      revision: 5,
      timezone: "America/Recife",
    });
    mockedUpdatePreferences.mockResolvedValue({
      ...preferences,
      capacity_reserve_percent: 15,
      minimum_session_minutes: 20,
      preferred_session_minutes: 45,
      revision: 2,
      week_starts_on: 0,
    });
    mockedUpdateProgress.mockResolvedValue({
      ...profile,
      onboarding_step: 2,
      revision: 6,
    });
    const request = new Request("https://seekin.example.test/onboarding", {
      body: new URLSearchParams({
        capacityReservePercent: "15",
        currentStep: "1",
        intent: "next",
        minimumSessionMinutes: "20",
        preferencesRevision: "1",
        preferredSessionMinutes: "45",
        revision: "4",
        timezone: "America/Recife",
        weekStartsOn: "0",
      }),
      headers: { origin: "https://seekin.example.test" },
      method: "POST",
    });

    const response = (await action(args(request))) as Response;

    expect(mockedUpdateProfile).toHaveBeenCalledWith({}, "user-1", 4, {
      displayName: null,
      timezone: "America/Recife",
    });
    expect(mockedUpdatePreferences).toHaveBeenCalledWith({}, "user-1", 1, {
      capacity_reserve_percent: 15,
      minimum_session_minutes: 20,
      preferred_session_minutes: 45,
      week_starts_on: 0,
    });
    expect(mockedUpdateProgress).toHaveBeenCalledWith({}, "user-1", 5, 2);
    expect(response.status).toBe(200);
  });

  it("rejects a stale browser step without overwriting progress", async () => {
    const request = new Request("https://seekin.example.test/onboarding", {
      body: new URLSearchParams({
        currentStep: "0",
        intent: "next",
        revision: "3",
      }),
      headers: { origin: "https://seekin.example.test" },
      method: "POST",
    });

    const response = (await action(args(request))) as Response;

    expect(response.status).toBe(409);
    expect(mockedUpdateProgress).not.toHaveBeenCalled();
  });

  it("consolidates and saves availability before advancing", async () => {
    mockedEnsureProfile.mockResolvedValue({ ...profile, onboarding_step: 2 });
    mockedReplaceAvailability.mockResolvedValue([
      {
        day_of_week: 1,
        end_local: "21:00:00",
        id: "window-1",
        revision: 1,
        start_local: "18:00:00",
        timezone: "America/Sao_Paulo",
      },
    ]);
    mockedUpdateProgress.mockResolvedValue({
      ...profile,
      onboarding_step: 3,
      revision: 5,
    });
    const body = new URLSearchParams({
      currentStep: "2",
      intent: "next",
      revision: "4",
    });
    const rows: Array<[string, string, string]> = [
      ["1", "18:00", "20:00"],
      ["1", "19:00", "21:00"],
    ];
    for (const [day, start, end] of rows) {
      body.append("availabilityDay", day);
      body.append("availabilityStart", start);
      body.append("availabilityEnd", end);
    }
    const response = (await action(
      args(
        new Request("https://seekin.example.test/onboarding", {
          body,
          headers: { origin: "https://seekin.example.test" },
          method: "POST",
        }),
      ),
    )) as Response;

    expect(mockedReplaceAvailability).toHaveBeenCalledWith(
      {},
      "user-1",
      "America/Sao_Paulo",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      [],
      [{ day_of_week: 1, start_local: "18:00", end_local: "21:00" }],
    );
    expect(mockedUpdateProgress).toHaveBeenCalledWith({}, "user-1", 4, 3);
    expect(response.status).toBe(200);
  });

  it("requires an explicit skip when no availability is informed", async () => {
    mockedEnsureProfile.mockResolvedValue({ ...profile, onboarding_step: 2 });
    const response = (await action(
      args(
        new Request("https://seekin.example.test/onboarding", {
          body: new URLSearchParams({
            currentStep: "2",
            intent: "next",
            revision: "4",
          }),
          headers: { origin: "https://seekin.example.test" },
          method: "POST",
        }),
      ),
    )) as Response;

    expect(response.status).toBe(400);
    expect(mockedReplaceAvailability).not.toHaveBeenCalled();
  });

  it("allows an explicit decision to configure availability later", async () => {
    mockedEnsureProfile.mockResolvedValue({ ...profile, onboarding_step: 2 });
    mockedReplaceAvailability.mockResolvedValue([]);
    mockedUpdateProgress.mockResolvedValue({
      ...profile,
      onboarding_step: 3,
      revision: 5,
    });
    const response = (await action(
      args(
        new Request("https://seekin.example.test/onboarding", {
          body: new URLSearchParams({
            currentStep: "2",
            intent: "skip",
            revision: "4",
          }),
          headers: { origin: "https://seekin.example.test" },
          method: "POST",
        }),
      ),
    )) as Response;

    expect(mockedReplaceAvailability).toHaveBeenCalledWith(
      {},
      "user-1",
      "America/Sao_Paulo",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      [],
      [],
    );
    expect(mockedUpdateProgress).toHaveBeenCalledWith({}, "user-1", 4, 3);
    expect(response.status).toBe(200);
  });

  it("expands and saves a recurring commitment before advancing", async () => {
    mockedEnsureProfile.mockResolvedValue({ ...profile, onboarding_step: 3 });
    mockedReplaceRecurring.mockResolvedValue([]);
    mockedUpdateProgress.mockResolvedValue({
      ...profile,
      onboarding_step: 4,
      revision: 5,
    });
    const body = new URLSearchParams({
      currentStep: "3",
      intent: "next",
      revision: "4",
    });
    body.append("blockTitle", "Academia");
    body.append("blockDays", "1,3,5");
    body.append("blockStart", "10:00");
    body.append("blockEnd", "11:00");

    const response = (await action(
      args(
        new Request("https://seekin.example.test/onboarding", {
          body,
          headers: { origin: "https://seekin.example.test" },
          method: "POST",
        }),
      ),
    )) as Response;

    expect(mockedReplaceRecurring).toHaveBeenCalledWith(
      {},
      "user-1",
      "America/Sao_Paulo",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      [],
      [
        {
          day_of_week: 1,
          end_local: "11:00",
          start_local: "10:00",
          title: "Academia",
        },
        {
          day_of_week: 3,
          end_local: "11:00",
          start_local: "10:00",
          title: "Academia",
        },
        {
          day_of_week: 5,
          end_local: "11:00",
          start_local: "10:00",
          title: "Academia",
        },
      ],
    );
    expect(mockedUpdateProgress).toHaveBeenCalledWith({}, "user-1", 4, 4);
    expect(response.status).toBe(200);
  });

  it("identifies overlapping commitments without persisting them", async () => {
    mockedEnsureProfile.mockResolvedValue({ ...profile, onboarding_step: 3 });
    const body = new URLSearchParams({
      currentStep: "3",
      intent: "next",
      revision: "4",
    });
    const overlaps: Array<[string, string, string]> = [
      ["Academia", "10:00", "11:00"],
      ["Trabalho", "10:30", "12:00"],
    ];
    for (const [title, start, end] of overlaps) {
      body.append("blockTitle", title);
      body.append("blockDays", "1");
      body.append("blockStart", start);
      body.append("blockEnd", end);
    }

    const response = (await action(
      args(
        new Request("https://seekin.example.test/onboarding", {
          body,
          headers: { origin: "https://seekin.example.test" },
          method: "POST",
        }),
      ),
    )) as Response;

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Academia e Trabalho se sobrepõem no mesmo dia.",
    });
    expect(mockedReplaceRecurring).not.toHaveBeenCalled();
    expect(mockedUpdateProgress).not.toHaveBeenCalled();
  });

  it("allows recurring commitments to be skipped explicitly", async () => {
    mockedEnsureProfile.mockResolvedValue({ ...profile, onboarding_step: 3 });
    mockedReplaceRecurring.mockResolvedValue([]);
    mockedUpdateProgress.mockResolvedValue({
      ...profile,
      onboarding_step: 4,
      revision: 5,
    });
    const response = (await action(
      args(
        new Request("https://seekin.example.test/onboarding", {
          body: new URLSearchParams({
            currentStep: "3",
            intent: "skip",
            revision: "4",
          }),
          headers: { origin: "https://seekin.example.test" },
          method: "POST",
        }),
      ),
    )) as Response;

    expect(mockedReplaceRecurring).toHaveBeenCalledWith(
      {},
      "user-1",
      "America/Sao_Paulo",
      expect.any(String),
      [],
      [],
    );
    expect(mockedUpdateProgress).toHaveBeenCalledWith({}, "user-1", 4, 4);
    expect(response.status).toBe(200);
  });

  it("creates the first discipline before advancing", async () => {
    mockedEnsureProfile.mockResolvedValue({ ...profile, onboarding_step: 4 });
    mockedSaveDiscipline.mockResolvedValue({
      color_key: null,
      description: null,
      id: "discipline-1",
      name: "Cálculo I",
      revision: 1,
    });
    mockedUpdateProgress.mockResolvedValue({
      ...profile,
      onboarding_step: 5,
      revision: 5,
    });
    const response = (await action(
      args(
        new Request("https://seekin.example.test/onboarding", {
          body: new URLSearchParams({
            currentStep: "4",
            disciplineName: "  Cálculo I  ",
            intent: "next",
            revision: "4",
          }),
          headers: { origin: "https://seekin.example.test" },
          method: "POST",
        }),
      ),
    )) as Response;

    expect(mockedSaveDiscipline).toHaveBeenCalledWith(
      {},
      "user-1",
      null,
      "Cálculo I",
    );
    expect(mockedUpdateProgress).toHaveBeenCalledWith({}, "user-1", 4, 5);
    await expect(response.json()).resolves.toMatchObject({
      discipline: { id: "discipline-1", name: "Cálculo I" },
      step: 5,
    });
  });

  it("does not create a discipline when the optional step is skipped", async () => {
    mockedEnsureProfile.mockResolvedValue({ ...profile, onboarding_step: 4 });
    mockedUpdateProgress.mockResolvedValue({
      ...profile,
      onboarding_step: 5,
      revision: 5,
    });
    const response = (await action(
      args(
        new Request("https://seekin.example.test/onboarding", {
          body: new URLSearchParams({
            currentStep: "4",
            intent: "skip",
            revision: "4",
          }),
          headers: { origin: "https://seekin.example.test" },
          method: "POST",
        }),
      ),
    )) as Response;

    expect(mockedSaveDiscipline).not.toHaveBeenCalled();
    expect(mockedUpdateProgress).toHaveBeenCalledWith({}, "user-1", 4, 5);
    expect(response.status).toBe(200);
  });

  it("keeps the discipline step when the name is empty", async () => {
    mockedEnsureProfile.mockResolvedValue({ ...profile, onboarding_step: 4 });
    const response = (await action(
      args(
        new Request("https://seekin.example.test/onboarding", {
          body: new URLSearchParams({
            currentStep: "4",
            disciplineName: "   ",
            intent: "next",
            revision: "4",
          }),
          headers: { origin: "https://seekin.example.test" },
          method: "POST",
        }),
      ),
    )) as Response;

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Informe o nome da disciplina.",
    });
    expect(mockedSaveDiscipline).not.toHaveBeenCalled();
    expect(mockedUpdateProgress).not.toHaveBeenCalled();
  });

  it("creates the first activity with a resolved local deadline", async () => {
    mockedEnsureProfile.mockResolvedValue({ ...profile, onboarding_step: 5 });
    mockedListDisciplines.mockResolvedValue([
      {
        color_key: null,
        description: null,
        id: "discipline-1",
        name: "Cálculo I",
        revision: 1,
      },
    ]);
    const created = {
      actual_minutes: 0,
      activity_type: "exercise",
      completed_at: null,
      created_at: "2026-09-14T18:00:00Z",
      deadline_at: "2026-09-19T02:59:00Z",
      deadline_has_time: false,
      deadline_local_date: "2026-09-18",
      deadline_local_time: null,
      deadline_timezone: "America/Sao_Paulo",
      discipline_id: "discipline-1",
      estimated_minutes: 100,
      id: "activity-1",
      notes_markdown: null,
      priority: 3,
      revision: 1,
      source: "manual",
      source_external_id: null,
      status: "active",
      title: "Lista de exercícios",
      updated_at: "2026-09-14T18:00:00Z",
      user_id: "user-1",
    };
    const create = vi.fn().mockResolvedValue(created);
    mockedActivityRepository.mockReturnValue({
      create,
      findById: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    });
    mockedUpdateProgress.mockResolvedValue({
      ...profile,
      onboarding_step: 6,
      revision: 5,
    });
    const response = (await action(
      args(
        new Request("https://seekin.example.test/onboarding", {
          body: new URLSearchParams({
            activityNotes: "",
            activityPriority: "3",
            activityTitle: "Lista de exercícios",
            activityType: "exercise",
            currentStep: "5",
            deadlineDate: "2026-09-18",
            deadlineTime: "",
            disciplineId: "discipline-1",
            effortHours: "1",
            effortMinutes: "40",
            intent: "next",
            revision: "4",
          }),
          headers: { origin: "https://seekin.example.test" },
          method: "POST",
        }),
      ),
    )) as Response;

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        deadline_at: "2026-09-19T02:59:00Z",
        deadline_has_time: false,
        deadline_local_time: null,
        discipline_id: "discipline-1",
        estimated_minutes: 100,
        user_id: "user-1",
      }),
    );
    expect(mockedUpdateProgress).toHaveBeenCalledWith({}, "user-1", 4, 6);
    await expect(response.json()).resolves.toMatchObject({
      activity: { id: "activity-1", title: "Lista de exercícios" },
      proposal: {
        feasibility: "feasible",
        planId: "95000000-0000-4000-8000-000000000056",
      },
      step: 6,
    });
  });

  it("publishes the accepted first plan and completes onboarding", async () => {
    mockedEnsureProfile.mockResolvedValue({ ...profile, onboarding_step: 6 });
    plannerInvoke.mockResolvedValue({
      data: {
        data: {
          planId: "95000000-0000-4000-8000-000000000056",
          status: "published",
        },
      },
      error: null,
    } as never);
    mockedUpdateProgress.mockResolvedValue({
      ...profile,
      onboarding_status: "completed",
      onboarding_step: 7,
      revision: 5,
    });

    const response = (await action(
      args(
        new Request("https://seekin.example.test/onboarding", {
          body: new URLSearchParams({
            currentStep: "6",
            intent: "confirm-plan",
            operationKey: "confirm-first-plan",
            planId: "95000000-0000-4000-8000-000000000056",
            revision: "4",
          }),
          headers: { origin: "https://seekin.example.test" },
          method: "POST",
        }),
      ),
    )) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/app");
    expect(mockedUpdateProgress).toHaveBeenCalledWith({}, "user-1", 4, 7);
  });

  it("redirects completed onboarding to the app", async () => {
    mockedEnsureProfile.mockResolvedValue({
      ...profile,
      onboarding_status: "completed",
      onboarding_step: 7,
    });

    const response = (await loader(
      args(new Request("https://seekin.example.test/onboarding")),
    )) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/app");
  });
});
