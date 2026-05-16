"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeProviderProps {
  attribute?: "class";
  children: React.ReactNode;
  defaultTheme?: Theme;
  disableTransitionOnChange?: boolean;
  enableSystem?: boolean;
  storageKey?: string;
}

interface ThemeContextValue {
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  systemTheme: "light" | "dark";
  theme: Theme;
  themes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const mediaQuery = "(prefers-color-scheme: dark)";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia(mediaQuery).matches ? "dark" : "light";
}

function applyTheme(theme: Theme, systemTheme: "light" | "dark") {
  const resolvedTheme = theme === "system" ? systemTheme : theme;
  const root = document.documentElement;

  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);
  root.style.colorScheme = resolvedTheme;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
  storageKey = "theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(storageKey) as Theme | null;
    const nextTheme =
      storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
        ? storedTheme
        : defaultTheme;

    setThemeState(enableSystem ? nextTheme : nextTheme === "system" ? "light" : nextTheme);
    setSystemTheme(getSystemTheme());
  }, [defaultTheme, enableSystem, storageKey]);

  useEffect(() => {
    applyTheme(theme, systemTheme);
  }, [systemTheme, theme]);

  useEffect(() => {
    const media = window.matchMedia(mediaQuery);
    const onChange = () => setSystemTheme(getSystemTheme());
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) {
        return;
      }

      const nextTheme = event.newValue;
      if (nextTheme === "light" || nextTheme === "dark" || nextTheme === "system") {
        setThemeState(nextTheme);
      }
    };

    media.addEventListener("change", onChange);
    window.addEventListener("storage", onStorage);

    return () => {
      media.removeEventListener("change", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [storageKey]);

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      const safeTheme = enableSystem ? nextTheme : nextTheme === "system" ? "light" : nextTheme;

      window.localStorage.setItem(storageKey, safeTheme);
      setThemeState(safeTheme);
    },
    [enableSystem, storageKey],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      resolvedTheme: theme === "system" ? systemTheme : theme,
      setTheme,
      systemTheme,
      theme,
      themes: enableSystem ? ["light", "dark", "system"] : ["light", "dark"],
    }),
    [enableSystem, setTheme, systemTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return value;
}
