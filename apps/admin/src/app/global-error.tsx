"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";

const copy = {
  ar: {
    dashboard: "العودة إلى لوحة القيادة",
    description: "حدث خطأ عام يمنع تحميل لوحة الإدارة. أعد المحاولة، وإذا استمرت المشكلة راجع حالة الـ API وعمليات الطوابير قبل متابعة العمل.",
    eyebrow: "تعطل عام",
    retry: "إعادة المحاولة",
    title: "تعذر تحميل لوحة الإدارة",
  },
  en: {
    dashboard: "Return to dashboard",
    description: "A platform-level error blocked the admin app from loading. Retry first, then check API and queue health before continuing operator work.",
    eyebrow: "Global failure",
    retry: "Retry",
    title: "Admin workspace failed to load",
  },
} as const;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const locale = useMemo(
    () => (typeof document !== "undefined" && document.documentElement.lang === "ar" ? "ar" : "en"),
    [],
  );
  const t = copy[locale];

  return (
    <html dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
      <body className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
        <main className="w-full max-w-2xl rounded-lg border border-line bg-panel p-6">
          <p className="text-sm font-semibold uppercase text-brand">{t.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold">{t.title}</h1>
          <p className="mt-3 text-sm text-muted">{t.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
              onClick={() => reset()}
              type="button"
            >
              {t.retry}
            </button>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand"
              href="/"
            >
              {t.dashboard}
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
