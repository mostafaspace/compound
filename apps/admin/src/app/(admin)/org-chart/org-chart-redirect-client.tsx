"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function OrgChartRedirectClient({ targetHref }: { targetHref: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(targetHref);
  }, [router, targetHref]);

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground">
      <section className="mx-auto max-w-xl rounded-xl border border-line bg-panel p-6">
        <p className="text-sm font-semibold uppercase text-brand">Org Chart</p>
        <h1 className="mt-2 text-2xl font-semibold">Opening organization chart...</h1>
        <p className="mt-2 text-sm text-muted">
          If the page does not open automatically, use the button below.
        </p>
        <Link
          className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
          href={targetHref}
        >
          Open org chart
        </Link>
      </section>
    </main>
  );
}
