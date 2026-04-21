"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { setUserLocale } from "@/services/locale";

export function LanguageToggle() {
  const locale = useLocale();
  const t = useTranslations("Language");
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
        className="flex h-7 items-center justify-center rounded-md px-3 text-sm font-bold text-muted transition-colors hover:text-foreground disabled:opacity-50"
        disabled={isPending}
        onClick={handleToggle}
        title={t("toggle")}
        type="button"
      >
        {locale === "en" ? t("arabic") : "EN"}
      </button>
    </div>
  );
}
