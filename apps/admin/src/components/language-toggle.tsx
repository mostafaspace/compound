"use client";

import { useLocale, useTranslations } from "next-intl";

export function LanguageToggle() {
  const locale = useLocale();
  const t = useTranslations("Language");

  const handleToggle = () => {
    const nextLocale = locale === "en" ? "ar" : "en";
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  };

  return (
    <div className="flex h-9 items-center justify-center rounded-lg border border-line bg-panel p-1">
      <button
        className="flex h-7 items-center justify-center rounded-md px-3 text-sm font-bold text-muted transition-colors hover:text-foreground disabled:opacity-50"
        onClick={handleToggle}
        title={t("toggle")}
        type="button"
      >
        {locale === "en" ? t("arabic") : "EN"}
      </button>
    </div>
  );
}
