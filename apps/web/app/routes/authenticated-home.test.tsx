import { beforeEach, describe, expect, it, vi } from "vitest";

import { createRequestSessionClient } from "../auth/runtime-auth";
import { ensureProfile, updateProfile } from "@seekin/data-access";
import { action, loader } from "./authenticated-home";

vi.mock("../auth/runtime-auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../auth/runtime-auth")>()),
  createRequestSessionClient: vi.fn(),
}));
vi.mock("@seekin/data-access", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@seekin/data-access")>()),
  ensureProfile: vi.fn(),
  updateProfile: vi.fn(),
}));

const mockedSessionClient = vi.mocked(createRequestSessionClient);
const mockedEnsureProfile = vi.mocked(ensureProfile);
const mockedUpdateProfile = vi.mocked(updateProfile);

function loaderArguments(url = "https://seekin.example.test/app") {
  return {
    context: {} as never,
    params: {},
    request: new Request(url),
  } as never;
}

describe("SKN-041 protected route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedEnsureProfile.mockResolvedValue({
      display_name: null,
      onboarding_status: "completed",
      onboarding_step: 7,
      revision: 1,
      timezone: "America/Sao_Paulo",
      user_id: "private-user-id",
    });
  });

  it("redirects an invalid session to login with the requested route", async () => {
    mockedSessionClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { code: "session_not_found", status: 403 },
        }),
      } as never,
      client: {} as never,
      headers: new Headers({ "cache-control": "no-store" }),
    });

    const response = await loader(
      loaderArguments("https://seekin.example.test/app?view=today"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "/entrar?next=%2Fapp%3Fview%3Dtoday",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("renders no private identity data for a verified session", async () => {
    mockedSessionClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "private-user-id" } },
          error: null,
        }),
      } as never,
      client: {} as never,
      headers: new Headers({
        "cache-control": "private, no-store",
        "set-cookie": "refreshed=session; Path=/; SameSite=Lax",
      }),
    });

    const response = await loader(loaderArguments());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      profile: {
        display_name: null,
        revision: 1,
        timezone: "America/Sao_Paulo",
      },
    });
    expect(response.headers.get("set-cookie")).toContain("refreshed=session");
  });

  it("routes an incomplete profile to onboarding", async () => {
    mockedSessionClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "private-user-id" } },
          error: null,
        }),
      } as never,
      client: {} as never,
      headers: new Headers({ "cache-control": "private, no-store" }),
    });
    mockedEnsureProfile.mockResolvedValue({
      display_name: null,
      onboarding_status: "in_progress",
      onboarding_step: 1,
      revision: 2,
      timezone: "America/Sao_Paulo",
      user_id: "private-user-id",
    });

    const response = await loader(loaderArguments());

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/onboarding");
  });

  it("fails closed when the Auth service cannot verify the session", async () => {
    mockedSessionClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { code: "service_unavailable", status: 503 },
        }),
      } as never,
      client: {} as never,
      headers: new Headers({ "cache-control": "no-store" }),
    });

    await expect(loader(loaderArguments())).rejects.toMatchObject({
      status: 503,
    });
  });

  it("fails closed when the profile cannot be recovered", async () => {
    mockedEnsureProfile.mockResolvedValue(null);
    mockedSessionClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "private-user-id" } },
          error: null,
        }),
      } as never,
      client: {} as never,
      headers: new Headers({ "cache-control": "no-store" }),
    });

    await expect(loader(loaderArguments())).rejects.toMatchObject({
      status: 503,
    });
  });
});

describe("SKN-044 profile update", () => {
  beforeEach(() => vi.clearAllMocks());

  function profileRequest() {
    return new Request("https://seekin.example.test/app", {
      body: new URLSearchParams({
        displayName: " Ana ",
        intent: "save-profile",
        revision: "1",
        timezone: "America/Recife",
      }),
      headers: { origin: "https://seekin.example.test" },
      method: "POST",
    });
  }

  function authenticatedClient() {
    mockedSessionClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      } as never,
      client: {} as never,
      headers: new Headers({ "cache-control": "no-store" }),
    });
  }

  it("updates only the verified user's current revision", async () => {
    authenticatedClient();
    mockedUpdateProfile.mockResolvedValue({
      display_name: "Ana",
      onboarding_status: "completed",
      onboarding_step: 7,
      revision: 2,
      timezone: "America/Recife",
      user_id: "user-1",
    });

    const response = await action({
      context: {},
      params: {},
      request: profileRequest(),
    } as never);
    expect(mockedUpdateProfile).toHaveBeenCalledWith({}, "user-1", 1, {
      displayName: "Ana",
      timezone: "America/Recife",
    });
    expect(response.status).toBe(200);
  });

  it("reports a revision conflict without overwriting newer data", async () => {
    authenticatedClient();
    mockedUpdateProfile.mockResolvedValue(null);

    const response = await action({
      context: {},
      params: {},
      request: profileRequest(),
    } as never);
    expect(response.status).toBe(409);
  });
});

describe("SKN-042 logout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ends only the current session and clears private browser state", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    mockedSessionClient.mockReturnValue({
      auth: { signOut } as never,
      client: {} as never,
      headers: new Headers({ "cache-control": "no-store" }),
    });
    const request = new Request("https://seekin.example.test/app", {
      body: new URLSearchParams({ intent: "logout" }),
      headers: {
        cookie: "sb-project-auth-token=private; theme=calm",
        origin: "https://seekin.example.test",
      },
      method: "POST",
    });

    const response = await action({
      context: {},
      params: {},
      request,
    } as never);

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/entrar?status=signed-out");
    expect(response.headers.get("clear-site-data")).toBe('"cache", "storage"');
    expect(response.headers.get("set-cookie")).not.toContain("theme=");
  });

  it("rejects cross-origin logout", async () => {
    await expect(
      action({
        context: {} as never,
        params: {},
        request: new Request("https://seekin.example.test/app", {
          body: new URLSearchParams({ intent: "logout" }),
          headers: { origin: "https://attacker.example" },
          method: "POST",
        }),
      } as never),
    ).rejects.toMatchObject({ status: 403 });

    expect(mockedSessionClient).not.toHaveBeenCalled();
  });

  it("clears local state even when Auth is unavailable", async () => {
    mockedSessionClient.mockReturnValue({
      auth: {
        signOut: vi.fn().mockRejectedValue(new Error("network unavailable")),
      } as never,
      client: {} as never,
      headers: new Headers(),
    });
    const request = new Request("https://seekin.example.test/app", {
      body: new URLSearchParams({ intent: "logout" }),
      headers: {
        cookie: "sb-project-auth-token=private",
        origin: "https://seekin.example.test",
      },
      method: "POST",
    });

    const response = await action({
      context: {},
      params: {},
      request,
    } as never);

    expect(response.status).toBe(302);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
