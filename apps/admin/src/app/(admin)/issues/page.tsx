import type { IssueCategory, IssueStatus } from "@compound/contracts";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { SiteNav } from "@/components/site-nav";
import { getCurrentUser, getIssues, getSystemStatus } from "@/lib/api";
import { issuePriorityBadgeClass, issueStatusBadgeClass } from "@/lib/semantic-badges";
import { requireAdminUser } from "@/lib/session";

interface IssuesPageProps {
  searchParams?: Promise<{
    status?: string;
    category?: string;
  }>;
}

const statusValues: Array<IssueStatus | "all"> = ["all", "new", "in_progress", "escalated", "resolved", "closed"];
const categoryValues: Array<IssueCategory | "all"> = ["all", "maintenance", "security", "cleaning", "noise", "other"];

function parseStatus(value?: string): IssueStatus | "all" {
  return statusValues.includes(value as IssueStatus | "all") ? (value as IssueStatus | "all") : "all";
}

function parseCategory(value?: string): IssueCategory | "all" {
  return categoryValues.includes(value as IssueCategory | "all") ? (value as IssueCategory | "all") : "all";
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function IssuesPage({ searchParams }: IssuesPageProps) {
  await requireAdminUser(getCurrentUser);
  const params = searchParams ? await searchParams : {};
  const activeStatus = parseStatus(params.status);
  const activeCategory = parseCategory(params.category);

  const [issues, t, locale, systemStatus] = await Promise.all([
    getIssues({ status: activeStatus, category: activeCategory }),
    getTranslations("Issues"),
    getLocale(),
    getSystemStatus(),
  ]);
  const isDegraded = systemStatus?.status !== "ok";
  const showDegradedWarning = isDegraded && issues.length === 0;

  const statusFilters: Array<{ label: string; value: IssueStatus | "all" }> = [
    { label: t("allStatuses"), value: "all" },
    { label: t("statusNew"), value: "new" },
    { label: t("statusInProgress"), value: "in_progress" },
    { label: t("statusEscalated"), value: "escalated" },
    { label: t("statusResolved"), value: "resolved" },
    { label: t("statusClosed"), value: "closed" },
  ];

  const categoryFilters: Array<{ label: string; value: IssueCategory | "all" }> = [
    { label: t("allCategories"), value: "all" },
    { label: t("catMaintenance"), value: "maintenance" },
    { label: t("catSecurity"), value: "security" },
    { label: t("catCleaning"), value: "cleaning" },
    { label: t("catNoise"), value: "noise" },
    { label: t("catOther"), value: "other" },
  ];

  const statusLabel: Record<string, string> = {
    new: t("statusNew"),
    in_progress: t("statusInProgress"),
    escalated: t("statusEscalated"),
    resolved: t("statusResolved"),
    closed: t("statusClosed"),
  };

  const priorityLabel: Record<string, string> = {
    low: t("priorityLow"),
    normal: t("priorityNormal"),
    high: t("priorityHigh"),
    urgent: t("priorityUrgent"),
  };

  const categoryLabel: Record<string, string> = {
    maintenance: t("catMaintenance"),
    security: t("catSecurity"),
    cleaning: t("catCleaning"),
    noise: t("catNoise"),
    other: t("catOther"),
  };

  const issuesHref = (nextStatus: IssueStatus | "all", nextCategory: IssueCategory | "all") => {
    const hrefParams = new URLSearchParams();
    if (nextStatus !== "all") hrefParams.set("status", nextStatus);
    if (nextCategory !== "all") hrefParams.set("category", nextCategory);
    const qs = hrefParams.toString();
    return `/issues${qs ? `?${qs}` : ""}`;
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[{ label: t("title") }]} />
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/">
              {t("back")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("title")}</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
              href="/compounds"
            >
              {t("propertyRegistry")}
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

        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">{t("status")}</h2>
            <nav className="mt-3 flex flex-wrap gap-2" aria-label={t("statusFiltersLabel")}>
              {statusFilters.map((f) => (
                <Link
                  className={`inline-flex h-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold ${
                    activeStatus === f.value
                      ? "border-brand bg-[#e6f3ef] text-brand"
                      : "border-line bg-panel text-foreground hover:border-brand"
                  }`}
                  href={issuesHref(f.value, activeCategory)}
                  key={f.value}
                >
                  {f.label}
                </Link>
              ))}
            </nav>
          </div>
          <div>
            <h2 className="text-xl font-semibold">{t("category")}</h2>
            <nav className="mt-3 flex flex-wrap gap-2" aria-label={t("categoryFiltersLabel")}>
              {categoryFilters.map((f) => (
                <Link
                  className={`inline-flex h-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold ${
                    activeCategory === f.value
                      ? "border-brand bg-[#e6f3ef] text-brand"
                      : "border-line bg-panel text-foreground hover:border-brand"
                  }`}
                  href={issuesHref(activeStatus, f.value)}
                  key={f.value}
                >
                  {f.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-line bg-panel">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("id")}</th>
                <th className="px-4 py-3 font-semibold">{t("issueTitle")}</th>
                <th className="px-4 py-3 font-semibold">{t("reporter")}</th>
                <th className="px-4 py-3 font-semibold">{t("category")}</th>
                <th className="px-4 py-3 font-semibold">{t("location")}</th>
                <th className="px-4 py-3 font-semibold">{t("assignee")}</th>
                <th className="px-4 py-3 font-semibold">{t("status")}</th>
                <th className="px-4 py-3 font-semibold">{t("priority")}</th>
                <th className="px-4 py-3 font-semibold">{t("createdAt")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {issues.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted" colSpan={9}>
                    {t("noIssues")}
                  </td>
                </tr>
              ) : (
                issues.map((issue) => (
                  <tr key={issue.id}>
                    <td className="px-4 py-4 font-mono text-xs">{issue.id.slice(0, 8)}</td>
                    <td className="px-4 py-4">
                      <Link className="font-semibold text-brand hover:text-brand-strong" href={`/issues/${issue.id}`}>
                        {issue.title}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold">{issue.reporter?.name ?? t("unknownReporter")}</div>
                      <div className="text-muted">{issue.reporter?.email ?? ""}</div>
                    </td>
                    <td className="px-4 py-4">{categoryLabel[issue.category] ?? issue.category}</td>
                    <td className="px-4 py-4">
                      {issue.unit ? (
                        <span>{t("unitNumber", { unit: issue.unit.unitNumber })}</span>
                      ) : issue.building ? (
                        <span>{issue.building.name}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">{issue.assignee?.name ?? <span className="text-muted">{t("unassigned")}</span>}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${issueStatusBadgeClass(issue.status)}`}>
                        {statusLabel[issue.status] ?? issue.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${issuePriorityBadgeClass(issue.priority)}`}>
                        {priorityLabel[issue.priority] ?? issue.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted">{formatDate(issue.createdAt, locale)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
