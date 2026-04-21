"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("Theme");

  return (
    <div className="flex h-9 items-center justify-center rounded-lg border border-line bg-panel p-1">
      <button
        aria-label={t("light")}
        onClick={() => setTheme("light")}
        className={`flex size-7 items-center justify-center rounded-md transition-colors ${
          theme === "light" ? "bg-background text-brand shadow-sm" : "text-muted hover:text-foreground"
        }`}
        title={t("light")}
        type="button"
      >
        <Sun className="size-4" />
      </button>
      <button
        aria-label={t("system")}
        onClick={() => setTheme("system")}
        className={`flex size-7 items-center justify-center rounded-md transition-colors ${
          theme === "system" ? "bg-background text-brand shadow-sm" : "text-muted hover:text-foreground"
        }`}
        title={t("system")}
        type="button"
      >
        <Monitor className="size-4" />
      </button>
      <button
        aria-label={t("dark")}
        onClick={() => setTheme("dark")}
        className={`flex size-7 items-center justify-center rounded-md transition-colors ${
          theme === "dark" ? "bg-background text-brand shadow-sm" : "text-muted hover:text-foreground"
        }`}
        title={t("dark")}
        type="button"
      >
        <Moon className="size-4" />
      </button>
    </div>
  );
}
