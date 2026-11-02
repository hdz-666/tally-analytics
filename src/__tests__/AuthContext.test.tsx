import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError, AxiosHeaders } from "axios";

const { session, getMe } = vi.hoisted(() => ({
  session: { current: null as object | null },
  getMe: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: session.current } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

vi.mock("@/services/usersApi", () => ({ usersApi: { getMe } }));

import { AuthProvider, useAuth } from "@/context/AuthContext";

function Probe() {
  const { role, accessError, loading } = useAuth();
  if (loading) return <div>loading</div>;
  return <div>{role ?? `none: ${accessError}`}</div>;
}

const renderAuth = (client = new QueryClient()) =>
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );

const forbidden = () =>
  new AxiosError("Forbidden", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 403,
    statusText: "Forbidden",
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

describe("AuthProvider", () => {
  beforeEach(() => {
    session.current = null;
    getMe.mockReset();
  });

  it("loads the role for a signed-in user", async () => {
    session.current = { user: { id: "u1" } };
    getMe.mockResolvedValue({ id: "u1", email: null, role: "executive", categories: [] });
    renderAuth();
    expect(await screen.findByText("executive")).toBeInTheDocument();
  });

  it("explains a missing role", async () => {
    session.current = { user: { id: "u1" } };
    getMe.mockRejectedValue(forbidden());
    renderAuth();
    expect(await screen.findByText(/Ask an admin to assign you a role/)).toBeInTheDocument();
  });

  it("does not call /me when signed out", async () => {
    renderAuth();
    expect(await screen.findByText(/none/)).toBeInTheDocument();
    expect(getMe).not.toHaveBeenCalled();
  });

  it("clears cached queries when the user changes", async () => {
    const client = new QueryClient();
    client.setQueryData(["sales", "monthly"], [{ sold_amount: 1 }]);
    session.current = { user: { id: "u1" } };
    getMe.mockResolvedValue({ id: "u1", email: null, role: "admin", categories: [] });
    renderAuth(client);
    await waitFor(() => expect(client.getQueryData(["sales", "monthly"])).toBeUndefined());
  });
});
