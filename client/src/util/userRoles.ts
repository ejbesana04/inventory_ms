import type { Role } from "../interfaces/user";

export function canManageUsers(role: Role | undefined): boolean {
  return role === "admin" || role === "manager";
}

/** Roles the signed-in user may assign when creating or editing accounts. */
export function assignableRoles(actorRole: Role | undefined): Role[] {
  if (actorRole === "admin") {
    return ["staff", "manager", "admin"];
  }
  if (actorRole === "manager") {
    return ["staff", "manager"];
  }
  return [];
}

export function roleLabel(role: Role): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
