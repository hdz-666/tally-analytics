import type { Role } from "@/models/user";

// Which roles may open each page. The backend enforces the same rules on
// every API call — this only decides what the menu and router show.
// Add the order book here when it lands: ["admin", "executive"].
export const PAGE_ROLES: Record<string, Role[]> = {
  "/": ["admin", "executive"],
  "/inventory": ["admin", "executive"],
  "/sales": ["admin", "executive", "company_exec"],
  "/area-sales": ["admin", "executive", "company_exec"],
  "/purchases": ["admin"],
  "/forecast": ["admin"],
  "/ledger": ["admin"],
  "/users": ["admin"],
  "/profile": ["admin", "executive", "company_exec"],
};

export const canAccess = (role: Role | null | undefined, path: string) =>
  !!role && (PAGE_ROLES[path]?.includes(role) ?? false);

/** Landing page for a role — the dashboard if they have it, else Sales. */
export const homePath = (role: Role) => (canAccess(role, "/") ? "/" : "/sales");
