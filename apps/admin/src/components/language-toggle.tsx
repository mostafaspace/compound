"use client";

import { useLocale } from "next-intl";
import { setUserLocale } from "@/services/locale";
import { useTransition } from "react";

export function LanguageToggle() {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const nextLocale = locale === "en" ? "ar" : "en";
    startTransition(async () => {
      await setUserLocale(nextLocale);
    });
  };

  return (
    <div className="flex h-9 items-center justify-center rounded-lg border border-line bg-panel p-1">
      <button
        onClick={handleToggle}
        disabled={isPending}
        className="flex h-7 items-center justify-center rounded-md px-3 text-sm font-bold text-muted transition-colors hover:text-foreground disabled:opacity-50"
        title="Toggle Language"
      >
        {locale === "en" ? "عربي" : "EN"}
      </button>
    </div>
  );
}
