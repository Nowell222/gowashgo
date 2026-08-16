import type { UserRole } from '@/lib/types';

/**
 * Role hierarchy and permissions.
 * Determines what each role can access and which routes they're redirected to after login.
 */

export const ROLE_LABELS: Record<UserRole, string> = {
  platform_admin: 'Platform Admin',
  branch_manager: 'Branch Manager',
  staff: 'Staff',
  rider: 'Rider',
  customer: 'Customer',
};

/** The landing page for each role after login */
export const ROLE_HOME_ROUTES: Record<UserRole, string> = {
  customer: '/customer',
  rider: '/rider',
  staff: '/staff',
  branch_manager: '/manager',
  platform_admin: '/admin',
};

/** Route prefix access per role */
export const ROLE_ROUTE_PREFIXES: Record<UserRole, string[]> = {
  customer: ['/customer'],
  rider: ['/rider'],
  staff: ['/staff'],
  branch_manager: ['/manager'],
  platform_admin: ['/admin'],
};

/** Roles that use the mobile layout */
export const MOBILE_ROLES: UserRole[] = ['customer', 'rider'];

/** Roles that use the desktop layout */
export const DESKTOP_ROLES: UserRole[] = ['staff', 'branch_manager', 'platform_admin'];

/** Roles that can be invited (not self-registered) */
export const INVITABLE_ROLES: UserRole[] = ['branch_manager', 'staff', 'rider'];

/** Roles a branch_manager can invite */
export const MANAGER_CAN_INVITE: UserRole[] = ['staff', 'rider'];

/** Roles a platform_admin can invite */
export const ADMIN_CAN_INVITE: UserRole[] = ['branch_manager', 'staff', 'rider'];

/**
 * Check if a user has permission to access a given route prefix.
 */
export function canAccessRoute(role: UserRole, pathname: string): boolean {
  const allowedPrefixes = ROLE_ROUTE_PREFIXES[role];
  if (!allowedPrefixes) return false;
  return allowedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Check if a role can invite another role.
 */
export function canInviteRole(inviterRole: UserRole, targetRole: UserRole): boolean {
  if (inviterRole === 'platform_admin') {
    return ADMIN_CAN_INVITE.includes(targetRole);
  }
  if (inviterRole === 'branch_manager') {
    return MANAGER_CAN_INVITE.includes(targetRole);
  }
  return false;
}

/**
 * Check if a role is a branch-scoped role (requires branch_id).
 */
export function isBranchScoped(role: UserRole): boolean {
  return ['branch_manager', 'staff', 'rider'].includes(role);
}
