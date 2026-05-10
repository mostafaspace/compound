import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SiteNav } from "@/components/site-nav";
import { VisitorGateWorkspace } from "@/components/visitors/visitor-gate-workspace";
import { getCurrentUser, getSystemStatus, getVisitorRequests } from "@/lib/api";
import { formatRoleLabel, getPrimaryEffectiveRole } from "@/lib/auth-access";
import { requireAdminUser } from "@/lib/session";

export default async function VisitorsPage() {
  const t = await getTranslations("Visitors");
  const user = await requireAdminUser(getCurrentUser, [
    "super_admin",
    "compound_admin",
    "support_agent",
    "security_guard",
  ]);
  const [visitors, systemStatus] = await Promise.all([getVisitorRequests(), getSystemStatus()]);
  const isDegraded = systemStatus?.status !== "ok";
  const showDegradedWarning = isDegraded && visitors.length === 0;
  const effectiveRoleLabel = formatRoleLabel(getPrimaryEffectiveRole(user));

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[{ label: t("title") }]} />
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase text-brand">{t("section")}</p>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{t("title")}</h1>
            <p className="mt-2 text-sm text-muted">
              {t("subtitle", { name: user.name, role: effectiveRoleLabel })}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold text-foreground transition hover:border-brand"
              href="/"
            >
              {t("nav.dashboard")}
            </Link>
            <Link
              className="inline-flex h-11 items-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold text-foreground transition hover:border-brand"
              href="/onboarding"
            >
              {t("nav.onboarding")}
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        {showDegradedWarning ? (
          <div className="mb-5 rounded-lg border border-[#e7d7a9] bg-[#fff8e8] px-4 py-3 text-sm text-[#7a5d1a]">
            <p className="font-semibold">{t("degraded.title")}</p>
            <p className="mt-1">{t("degraded.description")}</p>
          </div>
        ) : null}

        <VisitorGateWorkspace initialVisitors={visitors} />
      </section>
    </main>
  );
}
