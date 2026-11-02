import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Outlet } from "react-router";

// Routing smoke test: auth and pages are stubbed so only App's route table,
// guards and redirects are exercised.
const { auth, stub } = vi.hoisted(() => ({
  auth: {
    session: null as object | null,
    role: null as string | null,
    accessError: null as string | null,
    loading: false,
    signOut: () => {},
  },
  stub: (name: string) => ({ default: () => <div>{name} page</div> }),
}));

vi.mock("@/context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => auth,
}));

vi.mock("@/views/components/layout/AppLayout", () => ({
  default: () => (
    <div data-testid="layout">
      <Outlet />
    </div>
  ),
}));

vi.mock("@/views/pages/Dashboard", () => stub("Dashboard"));
vi.mock("@/views/pages/Inventory", () => stub("Inventory"));
vi.mock("@/views/pages/Sales", () => stub("Sales"));
vi.mock("@/views/pages/AreaSales", () => stub("AreaSales"));
vi.mock("@/views/pages/Forecast", () => stub("Forecast"));
vi.mock("@/views/pages/Ledger", () => stub("Ledger"));
vi.mock("@/views/pages/Profile", () => stub("Profile"));
vi.mock("@/views/pages/Users", () => stub("Users"));
vi.mock("@/views/pages/Login", () => stub("Login"));

import App from "@/App";

const renderAt = (path: string) => {
  window.history.pushState({}, "", path);
  return render(<App />);
};

describe("App routing", () => {
  beforeEach(() => {
    auth.session = null;
    auth.role = null;
    auth.accessError = null;
    auth.loading = false;
  });

  const signInAs = (role: string) => {
    auth.session = { user: { id: "u1" } };
    auth.role = role;
  };

  it("redirects anonymous users to /login", async () => {
    renderAt("/sales");
    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
  });

  it("redirects signed-in users away from /login", async () => {
    signInAs("admin");
    renderAt("/login");
    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/");
  });

  it.each([
    ["/", "Dashboard"],
    ["/inventory", "Inventory"],
    ["/sales", "Sales"],
    ["/area-sales", "AreaSales"],
    ["/forecast", "Forecast"],
    ["/ledger", "Ledger"],
    ["/users", "Users"],
    ["/profile", "Profile"],
  ])("renders %s inside the layout for an admin", async (path, page) => {
    signInAs("admin");
    renderAt(path);
    expect(await screen.findByText(`${page} page`)).toBeInTheDocument();
    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });

  it.each([
    ["executive", ["/", "/inventory", "/sales", "/area-sales", "/profile"]],
    ["company_exec", ["/sales", "/area-sales", "/profile"]],
  ])("lets a %s open only their pages", async (role, allowed) => {
    signInAs(role);
    for (const path of allowed) {
      const { unmount } = renderAt(path);
      expect(window.location.pathname).toBe(path);
      unmount();
    }
  });

  it.each([
    ["executive", "/forecast", "/", "Dashboard"],
    ["executive", "/ledger", "/", "Dashboard"],
    ["executive", "/users", "/", "Dashboard"],
    ["company_exec", "/", "/sales", "Sales"],
    ["company_exec", "/inventory", "/sales", "Sales"],
    ["company_exec", "/users", "/sales", "Sales"],
  ])("sends a %s away from %s to %s", async (role, path, home, page) => {
    signInAs(role);
    renderAt(path);
    expect(await screen.findByText(`${page} page`)).toBeInTheDocument();
    expect(window.location.pathname).toBe(home);
  });

  it("shows a no-access screen when the user has no role", async () => {
    auth.session = { user: { id: "u1" } };
    auth.accessError = "Ask an admin to assign you a role.";
    renderAt("/sales");
    expect(await screen.findByText("No access")).toBeInTheDocument();
    expect(screen.getByText("Ask an admin to assign you a role.")).toBeInTheDocument();
    expect(screen.queryByTestId("layout")).not.toBeInTheDocument();
  });

  it("renders nothing routed while auth is loading", () => {
    auth.loading = true;
    renderAt("/sales");
    expect(screen.queryByText("Sales page")).not.toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });
});
