"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-9 w-[104px] animate-pulse rounded-lg bg-panel border border-line" />;
  }

  return (
    <div className="flex h-9 items-center justify-center rounded-lg border border-line bg-panel p-1">
      <button
        onClick={() => setTheme("light")}
        className={`flex size-7 items-center justify-center rounded-md transition-colors ${
          theme === "light" ? "bg-background text-brand shadow-sm" : "text-muted hover:text-foreground"
        }`}
        title="Light Mode"
      >
        <Sun className="size-4" />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`flex size-7 items-center justify-center rounded-md transition-colors ${
          theme === "system" ? "bg-background text-brand shadow-sm" : "text-muted hover:text-foreground"
        }`}
        title="System Auto"
      >
        <Monitor className="size-4" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`flex size-7 items-center justify-center rounded-md transition-colors ${
          theme === "dark" ? "bg-background text-brand shadow-sm" : "text-muted hover:text-foreground"
        }`}
        title="Dark Mode"
      >
        <Moon className="size-4" />
      </button>
    </div>
  );
}
