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
  LogOutIcon,
  SunIcon,
  MoonIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export function AdminSidebar() {
  const { user, tenant, memberships, logout, switchTenant } = useAuth();
  const perms = usePermission();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const navItems = [
    { title: "Dashboard", href: "/app/dashboard", icon: LayoutDashboardIcon, show: true },
    { title: "Call Logs", href: "/app/calls", icon: PhoneCallIcon, show: perms.canViewCalls },
    { title: "Contacts", href: "/app/contacts", icon: ContactIcon, show: perms.canViewContacts },
    { title: "Brand Profile", href: "/app/settings/brand", icon: PaletteIcon, show: perms.canViewBrand },
    { title: "AI Assistant", href: "/app/settings/assistant", icon: BotIcon, show: perms.canViewAssistant },
    { title: "Working Hours", href: "/app/settings/hours", icon: ClockIcon, show: perms.canViewWorkingHours },
    { title: "Phone Numbers", href: "/app/settings/phone-numbers", icon: PhoneIcon, show: perms.canViewPhoneNumbers },
    { title: "Team", href: "/app/team", icon: UsersIcon, show: perms.canViewTeam },
    { title: "Billing", href: "/app/billing", icon: CreditCardIcon, show: perms.canViewBilling },
    { title: "Usage", href: "/app/usage", icon: BarChart3Icon, show: perms.canViewUsage },
  ];

  const visibleItems = navItems.filter((item) => item.show);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-brand-green">
          <PhoneIcon className="size-4 text-brand-forest" />
        </div>
        <div className="flex flex-col">
          <span className="font-heading text-sm font-semibold">
            Phone Assistant
          </span>
          <span className="label-tech !text-[10px] !tracking-[0.15em] text-brand-green">
            Admin
          </span>
        </div>
      </div>

      {/* Tenant Switcher */}
      {memberships.length > 1 && (
        <div className="border-b border-sidebar-border p-3">
          <Select
            value={tenant?.id ?? ""}
            onValueChange={(val) => { if (val) switchTenant(val); }}
          >
            <SelectTrigger className="w-full bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {memberships.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150 ${
                    isActive
                      ? "bg-sidebar-primary/10 text-sidebar-primary font-medium border-l-2 border-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <item.icon className={`size-4 ${isActive ? "text-sidebar-primary" : ""}`} />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-3">
        {/* Theme toggle */}
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <SunIcon className="size-4 text-sidebar-foreground/60" />
          <Switch
            checked={theme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            size="sm"
          />
          <MoonIcon className="size-4 text-sidebar-foreground/60" />
        </div>

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-brand-green/15 text-xs font-semibold text-brand-green">
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
            className="rounded-md p-1.5 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-brand-green"
            title="Sign out"
          >
            <LogOutIcon className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
