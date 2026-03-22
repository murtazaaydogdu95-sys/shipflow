import { describe, it, expect } from "vitest";
import { hasPermission } from "./permissions";
import type { OrgRole, Permission } from "./permissions";

describe("permissions", () => {
  describe("hasPermission", () => {
    const ALL_PERMISSIONS: Permission[] = [
      "org:delete",
      "org:billing",
      "org:settings",
      "org:members",
      "project:create",
      "project:delete",
      "project:settings",
      "project:agent",
      "project:git",
      "story:crud",
      "sprint:crud",
      "project:read",
    ];

    describe("OWNER role", () => {
      it("has all permissions", () => {
        for (const perm of ALL_PERMISSIONS) {
          expect(hasPermission("OWNER", perm)).toBe(true);
        }
      });
    });

    describe("ADMIN role", () => {
      const ADMIN_ALLOWED: Permission[] = [
        "org:settings",
        "org:members",
        "project:create",
        "project:delete",
        "project:settings",
        "project:agent",
        "project:git",
        "story:crud",
        "sprint:crud",
        "project:read",
      ];

      const ADMIN_DENIED: Permission[] = [
        "org:delete",
        "org:billing",
      ];

      it.each(ADMIN_ALLOWED)("has permission: %s", (perm) => {
        expect(hasPermission("ADMIN", perm)).toBe(true);
      });

      it.each(ADMIN_DENIED)("does NOT have permission: %s", (perm) => {
        expect(hasPermission("ADMIN", perm)).toBe(false);
      });
    });

    describe("MEMBER role", () => {
      const MEMBER_ALLOWED: Permission[] = [
        "story:crud",
        "sprint:crud",
        "project:read",
      ];

      const MEMBER_DENIED: Permission[] = [
        "org:delete",
        "org:billing",
        "org:settings",
        "org:members",
        "project:create",
        "project:delete",
        "project:settings",
        "project:agent",
        "project:git",
      ];

      it.each(MEMBER_ALLOWED)("has permission: %s", (perm) => {
        expect(hasPermission("MEMBER", perm)).toBe(true);
      });

      it.each(MEMBER_DENIED)("does NOT have permission: %s", (perm) => {
        expect(hasPermission("MEMBER", perm)).toBe(false);
      });
    });

    describe("edge cases", () => {
      it("returns false for unknown role", () => {
        expect(hasPermission("GUEST" as OrgRole, "project:read")).toBe(false);
      });
    });
  });
});
