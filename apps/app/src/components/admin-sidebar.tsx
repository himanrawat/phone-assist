"use client";

import { useAuth } from "@/lib/auth-context";
import { usePermission } from "@/hooks/use-permission";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  PhoneIcon,
  PhoneCallIcon,
  PaletteIcon,
  BotIcon,
  UsersIcon,
  ClockIcon,
  ContactIcon,
  CreditCardIcon,
  BarChart3Icon,
  Settings2Icon,
  LogOutIcon,
  ChevronsUpDownIcon,
} from "lucide-react";

export function AdminSidebar() {
  const { user, tenant, memberships, logout, switchTenant } = useAuth();
  const perms = usePermission();
  const pathname = usePathname();

  const navItems = [
    { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboardIcon, show: true },
    { title: "Call Logs", href: "/admin/calls", icon: PhoneCallIcon, show: perms.canViewCalls },
    { title: "Contacts", href: "/admin/contacts", icon: ContactIcon, show: perms.canViewContacts },
    { title: "Brand Profile", href: "/admin/settings/brand", icon: PaletteIcon, show: perms.canViewBrand },
    { title: "AI Assistant", href: "/admin/settings/assistant", icon: BotIcon, show: perms.canViewAssistant },
    { title: "Working Hours", href: "/admin/settings/hours", icon: ClockIcon, show: perms.canViewWorkingHours },
    { title: "Phone Numbers", href: "/admin/settings/phone-numbers", icon: PhoneIcon, show: perms.canViewPhoneNumbers },
    { title: "Team", href: "/admin/team", icon: UsersIcon, show: perms.canViewTeam },
    { title: "Billing", href: "/admin/billing", icon: CreditCardIcon, show: perms.canViewBilling },
    { title: "Usage", href: "/admin/usage", icon: BarChart3Icon, show: perms.canViewUsage },
  ];

  const visibleItems = navItems.filter((item) => item.show);

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <PhoneIcon className="size-4" />
        </div>
        <div className="flex flex-col">
          <span className="font-heading text-sm font-semibold">
            Phone Assistant
          </span>
          <span className="text-xs text-sidebar-foreground/50">Admin</span>
        </div>
      </div>

      {/* Tenant Switcher */}
      {memberships.length > 1 && (
        <div className="border-b border-sidebar-border p-3">
          <div className="relative">
            <select
              value={tenant?.id ?? ""}
              onChange={(e) => switchTenant(e.target.value)}
              className="w-full appearance-none rounded-md bg-sidebar-accent px-3 py-2 pr-8 text-sm text-sidebar-accent-foreground"
            >
              {memberships.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <ChevronsUpDownIcon className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 opacity-50" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <item.icon className="size-4" />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Platform link for super admins */}
        {user?.platformRole && (
          <div className="mt-6 border-t border-sidebar-border pt-3">
            <Link
              href="/platform/dashboard"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            >
              <Settings2Icon className="size-4" />
              Platform Admin
            </Link>
          </div>
        )}
      </nav>

      {/* Footer - User */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium">
            {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-sidebar-foreground/50">
              {tenant?.role?.replace("tenant_", "") ?? user?.email}
            </p>
          </div>
          <button
            onClick={() => logout()}
            className="rounded-md p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            title="Sign out"
          >
            <LogOutIcon className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
