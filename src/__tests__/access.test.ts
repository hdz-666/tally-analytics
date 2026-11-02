import { describe, it, expect } from "vitest";
import { canAccess, homePath } from "@/lib/access";

describe("access", () => {
  it("denies everything without a role", () => {
    expect(canAccess(null, "/sales")).toBe(false);
    expect(canAccess(undefined, "/profile")).toBe(false);
  });

  it("denies unknown pages", () => {
    expect(canAccess("admin", "/nope")).toBe(false);
  });

  it("gives each role the right home page", () => {
    expect(homePath("admin")).toBe("/");
    expect(homePath("executive")).toBe("/");
    expect(homePath("company_exec")).toBe("/sales");
  });

  it("keeps admin-only pages from other roles", () => {
    for (const path of ["/users", "/ledger", "/forecast", "/purchases"]) {
      expect(canAccess("admin", path)).toBe(true);
      expect(canAccess("executive", path)).toBe(false);
      expect(canAccess("company_exec", path)).toBe(false);
    }
  });
});
