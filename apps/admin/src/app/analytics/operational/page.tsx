import type { OperationalAnalytics } from "@compound/contracts";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getOperationalAnalytics } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

interface OperationalAnalyticsPageProps {
  searchParams?: Promise<{
    buildingId?: string;
    from?: string;
    to?: string;
  }>;
}

// ─── Metric card ─────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: "danger" | "warn" | "brand";
}) {
  const textColor =
    highlight === "danger"
      ? "text-danger"
      : highlight === "warn"
        ? "text-[#8a520c]"
        : highlight === "brand"
          ? "text-brand"
          : "text-foreground";

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-line bg-panel px-4 py-3">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <span className={`text-2xl font-semibold ${textColor}`}>{value.toLocaleString()}</span>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h2>
  );
}

export default async function OperationalAnalyticsPage({ searchParams }: OperationalAnalyticsPageProps) {
  await requireAdminUser(getCurrentUser, ["super_admin", "compound_admin", "support_agent"]);
  const params = searchParams ? await searchParams : {};

  const filters = {
    buildingId: params.buildingId?.trim() || undefined,
    from: params.from?.trim() || undefined,
    to: params.to?.trim() || undefined,
  };

  const [analytics, t, locale] = await Promise.all([
    getOperationalAnalytics(filters),
    getTranslations("OperationalAnalytics"),
    getLocale(),
  ]);

  function formatTime(iso: string): string {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(iso),
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/">
              {t("back")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-6 px-5 py-6 lg:px-8">
        {/* Filters */}
        <form className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-panel p-4">
          <label className="text-sm font-semibold">
            {t("filterFrom")}
            <input
              className="mt-2 block h-11 rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
              defaultValue={params.from ?? ""}
              name="from"
              type="date"
            />
          </label>
          <label className="text-sm font-semibold">
            {t("filterTo")}
            <input
              className="mt-2 block h-11 rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
              defaultValue={params.to ?? ""}
              name="to"
              type="date"
            />
          </label>
          <div className="flex gap-2">
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
              type="submit"
            >
              {t("filterApply")}
            </button>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
              href="/analytics/operational"
            >
              {t("filterClear")}
            </Link>
          </div>
        </form>

        {/* Data freshness */}
        {analytics && (
          <p className="text-xs text-muted">
            {t("generatedAt", { time: formatTime(analytics.generatedAt) })}
          </p>
        )}

        {!analytics ? (
          <div className="rounded-lg border border-line bg-panel px-6 py-12 text-center text-sm text-muted">
            Could not load analytics data. Please try again.
          </div>
        ) : (
          <>
            {/* Users */}
            <div>
              <SectionHeading title={t("sections.users")} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <MetricCard label={t("users.total")} value={analytics.users.total} />
                <MetricCard label={t("users.active")} value={analytics.users.active} highlight="brand" />
                <MetricCard label={t("users.invited")} value={analytics.users.invited} />
                <MetricCard label={t("users.pendingReview")} value={analytics.users.pendingReview} highlight="warn" />
                <MetricCard label={t("users.suspended")} value={analytics.users.suspended} highlight="danger" />
                <MetricCard label={t("users.archived")} value={analytics.users.archived} />
              </div>
            </div>

            {/* Invitations & Verifications */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <SectionHeading title={t("sections.invitations")} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <MetricCard label={t("invitations.total")} value={analytics.invitations.total} />
                  <MetricCard label={t("invitations.pending")} value={analytics.invitations.pending} highlight="warn" />
                  <MetricCard label={t("invitations.accepted")} value={analytics.invitations.accepted} highlight="brand" />
                  <MetricCard label={t("invitations.revoked")} value={analytics.invitations.revoked} />
                  <MetricCard label={t("invitations.expired")} value={analytics.invitations.expired} />
                </div>
              </div>

              <div>
                <SectionHeading title={t("sections.verifications")} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <MetricCard label={t("verifications.total")} value={analytics.verifications.total} />
                  <MetricCard label={t("verifications.pendingReview")} value={analytics.verifications.pendingReview} highlight="warn" />
                  <MetricCard label={t("verifications.moreInfoRequested")} value={analytics.verifications.moreInfoRequested} highlight="warn" />
                  <MetricCard label={t("verifications.approved")} value={analytics.verifications.approved} highlight="brand" />
                  <MetricCard label={t("verifications.rejected")} value={analytics.verifications.rejected} highlight="danger" />
                </div>
              </div>
            </div>

            {/* Documents */}
            <div>
              <SectionHeading title={t("sections.documents")} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard label={t("documents.total")} value={analytics.documents.total} />
                <MetricCard label={t("documents.submitted")} value={analytics.documents.submitted} highlight="warn" />
                <MetricCard label={t("documents.approved")} value={analytics.documents.approved} highlight="brand" />
                <MetricCard label={t("documents.rejected")} value={analytics.documents.rejected} highlight="danger" />
              </div>
            </div>

            {/* Visitors */}
            <div>
              <SectionHeading title={t("sections.visitors")} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <MetricCard label={t("visitors.total")} value={analytics.visitors.total} />
                <MetricCard label={t("visitors.pending")} value={analytics.visitors.pending} highlight="warn" />
                <MetricCard label={t("visitors.allowed")} value={analytics.visitors.allowed} highlight="brand" />
                <MetricCard label={t("visitors.denied")} value={analytics.visitors.denied} highlight="danger" />
                <MetricCard label={t("visitors.completed")} value={analytics.visitors.completed} />
                <MetricCard label={t("visitors.cancelled")} value={analytics.visitors.cancelled} />
              </div>
            </div>

            {/* Issues */}
            <div>
              <SectionHeading title={t("sections.issues")} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <MetricCard label={t("issues.total")} value={analytics.issues.total} />
                <MetricCard label={t("issues.new")} value={analytics.issues.new} />
                <MetricCard label={t("issues.inProgress")} value={analytics.issues.inProgress} />
                <MetricCard label={t("issues.escalated")} value={analytics.issues.escalated} highlight="danger" />
                <MetricCard label={t("issues.resolved")} value={analytics.issues.resolved} highlight="brand" />
                <MetricCard label={t("issues.closed")} value={analytics.issues.closed} />
              </div>
            </div>

            {/* Announcements & Votes */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <SectionHeading title={t("sections.announcements")} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <MetricCard label={t("announcements.total")} value={analytics.announcements.total} />
                  <MetricCard label={t("announcements.draft")} value={analytics.announcements.draft} />
                  <MetricCard label={t("announcements.published")} value={analytics.announcements.published} highlight="brand" />
                  <MetricCard label={t("announcements.archived")} value={analytics.announcements.archived} />
                  <MetricCard label={t("announcements.requiresAckCount")} value={analytics.announcements.requiresAckCount} highlight="warn" />
                  <MetricCard label={t("announcements.ackCount")} value={analytics.announcements.ackCount} highlight="brand" />
                </div>
              </div>

              <div>
                <SectionHeading title={t("sections.votes")} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <MetricCard label={t("votes.total")} value={analytics.votes.total} />
                  <MetricCard label={t("votes.draft")} value={analytics.votes.draft} />
                  <MetricCard label={t("votes.active")} value={analytics.votes.active} highlight="brand" />
                  <MetricCard label={t("votes.closed")} value={analytics.votes.closed} />
                  <MetricCard label={t("votes.cancelled")} value={analytics.votes.cancelled} />
                  <MetricCard label={t("votes.participations")} value={analytics.votes.participations} highlight="brand" />
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
