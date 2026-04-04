"use client";

import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  PhoneIcon,
  BuildingIcon,
  ServerIcon,
  CreditCardIcon,
  BarChart3Icon,
  ShieldCheckIcon,
  LogOutIcon,
  ArrowLeftIcon,
} from "lucide-react";

export function PlatformSidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const navItems = [
    { title: "Dashboard", href: "/platform/dashboard", icon: LayoutDashboardIcon },
    { title: "Tenants", href: "/platform/tenants", icon: BuildingIcon },
    { title: "Providers", href: "/platform/providers", icon: ServerIcon },
    { title: "Plans", href: "/platform/plans", icon: CreditCardIcon },
    { title: "Billing", href: "/platform/billing", icon: CreditCardIcon },
    { title: "Analytics", href: "/platform/analytics", icon: BarChart3Icon },
    { title: "Audit Log", href: "/platform/audit", icon: ShieldCheckIcon },
  ];

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
          <span className="text-xs text-sidebar-foreground/50">Platform</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
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

        {/* Back to admin link */}
        <div className="mt-6 border-t border-sidebar-border pt-3">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Tenant Admin
          </Link>
        </div>
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
              {user?.email}
            </p>
          </div>
          <button
            onClick={() => logout()}
            className="rounded-md p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOutIcon className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
