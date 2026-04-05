"use client";

import { useTheme } from "@/components/theme-provider";
import { Switch } from "@/components/ui/switch";
import { SunIcon, MoonIcon } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <SunIcon className="size-4 text-muted-foreground" />
      <Switch
        checked={theme === "dark"}
        onCheckedChange={toggleTheme}
        aria-label="Toggle dark mode"
      />
      <MoonIcon className="size-4 text-muted-foreground" />
    </div>
  );
}
