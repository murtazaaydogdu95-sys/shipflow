import { prisma } from "@/lib/prisma";

export type OrgRole = "OWNER" | "ADMIN" | "MEMBER";

export type Permission =
  | "org:delete"
  | "org:billing"
  | "org:settings"
  | "org:members"
  | "project:create"
  | "project:delete"
  | "project:settings"
  | "project:agent"
  | "project:git"
  | "story:crud"
  | "sprint:crud"
  | "project:read";

const ROLE_PERMISSIONS: Record<OrgRole, Set<Permission>> = {
  OWNER: new Set([
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
  ]),
  ADMIN: new Set([
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
  ]),
  MEMBER: new Set([
    "story:crud",
    "sprint:crud",
    "project:read",
  ]),
};

export function hasPermission(role: OrgRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/**
 * Check if a user has a specific org-level permission.
 * Returns the user's org role if they have the permission, null otherwise.
 */
export async function checkOrgPermission(
  userId: string,
  orgId: string,
  permission: Permission
): Promise<OrgRole | null> {
  const member = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId, orgId } },
    select: { role: true },
  });

  if (!member) return null;

  const role = member.role as OrgRole;
  if (!hasPermission(role, permission)) return null;

  return role;
}

/**
 * Require a user to have a specific org-level permission.
 * Throws if the user doesn't have access.
 */
export async function requireOrgPermission(
  userId: string,
  orgId: string,
  permission: Permission
): Promise<OrgRole> {
  const role = await checkOrgPermission(userId, orgId, permission);
  if (!role) throw new Error("Forbidden");
  return role;
}
