"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Phone,
  Palette,
  Bot,
  BookOpen,
  ChevronRight,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/calls", label: "Call Logs", icon: Phone },
    ],
  },
  {
    label: "Configuration",
    items: [
      { href: "/settings/brand", label: "Brand Profile", icon: Palette },
      { href: "/settings/ai", label: "AI & Providers", icon: Bot },
    ],
  },
  {
    label: "Resources",
    items: [
      { href: "/getting-started", label: "Getting Started", icon: BookOpen },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r border-sidebar-border bg-sidebar min-h-screen">
      {/* Logo / Brand */}
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/30">
            <Phone className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-sidebar-foreground tracking-tight">
              Phone Assistant
            </h1>
            <p className="text-[11px] text-sidebar-foreground/50">
              AI-Powered Admin
            </p>
          </div>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                        : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive
                          ? "text-sidebar-primary"
                          : "text-sidebar-foreground/45 group-hover:text-sidebar-foreground/70"
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                    {isActive && (
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-sidebar-foreground/30" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* User Profile */}
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-sidebar-accent/60 cursor-pointer">
              <Avatar className="h-8 w-8 ring-2 ring-sidebar-primary/30">
                <AvatarFallback className="bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 text-sidebar-primary-foreground text-xs font-semibold">
                  HR
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="truncate text-[13px] font-medium text-sidebar-foreground">
                  Himanshu Rawat
                </p>
                <p className="truncate text-[11px] text-sidebar-foreground/45">
                  Admin
                </p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/30 shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="end"
            className="w-56"
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">Himanshu Rawat</p>
                <p className="text-xs text-muted-foreground">
                  admin@himanshurawat.in
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
