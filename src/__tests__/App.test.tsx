import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Outlet } from "react-router";

// Routing smoke test: auth and pages are stubbed so only App's route table,
// guards and redirects are exercised.
const { auth, stub } = vi.hoisted(() => ({
  auth: { session: null as object | null, loading: false },
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
vi.mock("@/views/pages/Login", () => stub("Login"));

import App from "@/App";

const renderAt = (path: string) => {
  window.history.pushState({}, "", path);
  return render(<App />);
};

describe("App routing", () => {
  beforeEach(() => {
    auth.session = null;
    auth.loading = false;
  });

  it("redirects anonymous users to /login", async () => {
    renderAt("/sales");
    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
  });

  it("redirects signed-in users away from /login", async () => {
    auth.session = { user: { id: "u1" } };
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
    ["/profile", "Profile"],
  ])("renders %s inside the layout when signed in", async (path, page) => {
    auth.session = { user: { id: "u1" } };
    renderAt(path);
    expect(await screen.findByText(`${page} page`)).toBeInTheDocument();
    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });

  it("renders nothing routed while auth is loading", () => {
    auth.loading = true;
    renderAt("/sales");
    expect(screen.queryByText("Sales page")).not.toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });
});
