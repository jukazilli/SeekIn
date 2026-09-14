import { beforeEach, describe, expect, it, vi } from "vitest";

import { createRequestSessionClient } from "../auth/runtime-auth";
import { loader } from "./authenticated-home";

vi.mock("../auth/runtime-auth", () => ({
  createRequestSessionClient: vi.fn(),
}));

const mockedSessionClient = vi.mocked(createRequestSessionClient);

function loaderArguments(url = "https://seekin.example.test/app") {
  return {
    context: {} as never,
    params: {},
    request: new Request(url),
  } as never;
}

describe("SKN-041 protected route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects an invalid session to login with the requested route", async () => {
    mockedSessionClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { code: "session_not_found", status: 403 },
        }),
      } as never,
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
      headers: new Headers({
        "cache-control": "private, no-store",
        "set-cookie": "refreshed=session; Path=/; SameSite=Lax",
      }),
    });

    const response = await loader(loaderArguments());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ authenticated: true });
    expect(response.headers.get("set-cookie")).toContain("refreshed=session");
  });

  it("fails closed when the Auth service cannot verify the session", async () => {
    mockedSessionClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { code: "service_unavailable", status: 503 },
        }),
      } as never,
      headers: new Headers({ "cache-control": "no-store" }),
    });

    await expect(loader(loaderArguments())).rejects.toMatchObject({
      status: 503,
    });
  });
});
