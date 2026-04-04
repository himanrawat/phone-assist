"use client";

import { useAuth } from "@/lib/auth-context";
import { TenantRole } from "@phone-assistant/contracts";

/**
 * Permission helpers derived from the architecture permission matrix.
 * Returns boolean checks for common actions based on the active tenant role.
 */
export function usePermission() {
  const { tenant, user } = useAuth();
  const role = tenant?.role ?? null;

  return {
    // Current role
    role,
    isPlatformUser: !!user?.platformRole,
    isPlatformSuperAdmin: user?.platformRole === "platform_super_admin",
    isPlatformSupport: user?.platformRole === "platform_support",

    // Tenant role checks
    isTenantAdmin: role === TenantRole.ADMIN,
    isTenantManager: role === TenantRole.MANAGER,
    isTenantViewer: role === TenantRole.VIEWER,

    // Action-level permissions (from architecture permission matrix)

    // Calls
    canViewCalls: role != null,
    canMakeOutboundCall:
      role === TenantRole.ADMIN || role === TenantRole.MANAGER,

    // Brand
    canViewBrand: role != null,
    canEditBrand:
      role === TenantRole.ADMIN || role === TenantRole.MANAGER,

    // Assistant
    canViewAssistant: role != null,
    canEditAssistant: role === TenantRole.ADMIN,

    // Contacts
    canViewContacts: role != null,
    canEditContacts:
      role === TenantRole.ADMIN || role === TenantRole.MANAGER,

    // Working hours
    canViewWorkingHours: role != null,
    canEditWorkingHours: role === TenantRole.ADMIN,

    // Team
    canViewTeam: role === TenantRole.ADMIN,
    canInviteTeam: role === TenantRole.ADMIN,

    // Phone numbers
    canViewPhoneNumbers: role === TenantRole.ADMIN,
    canEditPhoneNumbers: role === TenantRole.ADMIN,

    // Billing
    canViewBilling: role === TenantRole.ADMIN,

    // Usage
    canViewUsage: role != null,
  };
}
