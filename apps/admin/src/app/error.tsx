"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Errors.route");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      <div className="w-full max-w-2xl rounded-lg border border-line bg-panel p-6">
        <p className="text-sm font-semibold uppercase text-brand">{t("eyebrow")}</p>
        <h1 className="mt-3 text-3xl font-semibold">{t("title")}</h1>
        <p className="mt-3 text-sm text-muted">{t("description")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
            onClick={() => reset()}
            type="button"
          >
            {t("retry")}
          </button>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand"
            href="/"
          >
            {t("dashboard")}
          </Link>
        </div>
      </div>
    </main>
  );
}
