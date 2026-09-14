import { beforeEach, describe, expect, it, vi } from "vitest";

import { ensureProfile, updateOnboardingProgress } from "@seekin/data-access";

import { createRequestSessionClient } from "../auth/runtime-auth";
import { action, loader } from "./onboarding";

vi.mock("../auth/runtime-auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../auth/runtime-auth")>()),
  createRequestSessionClient: vi.fn(),
}));
vi.mock("@seekin/data-access", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@seekin/data-access")>()),
  ensureProfile: vi.fn(),
  updateOnboardingProgress: vi.fn(),
}));

const mockedSessionClient = vi.mocked(createRequestSessionClient);
const mockedEnsureProfile = vi.mocked(ensureProfile);
const mockedUpdateProgress = vi.mocked(updateOnboardingProgress);

const profile = {
  display_name: null,
  onboarding_status: "in_progress",
  onboarding_step: 1,
  revision: 4,
  timezone: "America/Sao_Paulo",
  user_id: "user-1",
};

function authenticatedClient() {
  mockedSessionClient.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      }),
    } as never,
    client: {} as never,
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
  });

  it("resumes the last server-confirmed step", async () => {
    const response = (await loader(
      args(new Request("https://seekin.example.test/onboarding")),
    )) as Response;

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ revision: 4, step: 1 });
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
    await expect(response.json()).resolves.toEqual({ revision: 5, step: 1 });
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
