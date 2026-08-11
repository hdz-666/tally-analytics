import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import MockAdapter from "axios-mock-adapter";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}));

import api from "@/services/api";
import { supabase } from "@/lib/supabase";

// Intercept at the axios layer so we don't need a real URL
let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(api);
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { access_token: "test-token-xyz" } },
    error: null,
  } as Awaited<ReturnType<typeof supabase.auth.getSession>>);

  Object.defineProperty(window, "location", {
    value: { href: "" },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  mock.restore();
  vi.clearAllMocks();
});

describe("api request interceptor", () => {
  it("attaches Bearer token from active session", async () => {
    mock.onGet("/sales/monthly").reply((config) => {
      // Echo the Authorization header back in the response body
      return [200, { auth: config.headers?.["Authorization"] }];
    });

    const response = await api.get("/sales/monthly");
    expect(response.data.auth).toBe("Bearer test-token-xyz");
  });

  it("omits Authorization header when no active session", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as Awaited<ReturnType<typeof supabase.auth.getSession>>);

    mock.onGet("/sales/monthly").reply((config) => {
      return [200, { auth: config.headers?.["Authorization"] ?? null }];
    });

    const response = await api.get("/sales/monthly");
    expect(response.data.auth).toBeNull();
  });
});

describe("api response interceptor", () => {
  it("calls signOut and redirects to /login on 401", async () => {
    mock.onGet("/sales/monthly").reply(401, { detail: "Unauthorized" });

    try {
      await api.get("/sales/monthly");
    } catch {
      // expected rejection
    }

    expect(supabase.auth.signOut).toHaveBeenCalledOnce();
    expect(window.location.href).toBe("/login");
  });

  it("does not call signOut on non-401 errors", async () => {
    mock.onGet("/sales/monthly").reply(500, { detail: "Server Error" });

    try {
      await api.get("/sales/monthly");
    } catch {
      // expected rejection
    }

    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it("passes through successful responses unchanged", async () => {
    mock.onGet("/sales/monthly").reply(200, [{ item: "Widget A" }]);

    const response = await api.get("/sales/monthly");
    expect(response.status).toBe(200);
    expect(response.data[0].item).toBe("Widget A");
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });
});
