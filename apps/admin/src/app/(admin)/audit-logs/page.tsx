import type { AuditLogEntry, AuditSeverity } from "@compound/contracts";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

import { AdminPagination } from "@/components/admin-pagination";
import { SiteNav } from "@/components/site-nav";
import { getAuditLogsPage, getCurrentUser } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

interface AuditLogsPageProps {
  searchParams?: Promise<{
    action?: string;
    actorId?: string;
    from?: string;
    method?: string;
    module?: string;
    page?: string;
    q?: string;
    severity?: string;
    to?: string;
  }>;
}

const methodOptions = ["", "GET", "POST", "PATCH", "PUT", "DELETE"];
const severityOptions: Array<{ value: string; labelKey: string }> = [
  { value: "", labelKey: "all" },
  { value: "info", labelKey: "severityInfo" },
  { value: "warning", labelKey: "severityWarning" },
  { value: "critical", labelKey: "severityCritical" },
];

function statusTone(statusCode: number | null): string {
  if (!statusCode) {
    return "bg-background text-muted";
  }

  if (statusCode >= 500) {
    return "bg-[#fde8e5] text-danger";
  }

  if (statusCode >= 400) {
    return "bg-[#fff5e5] text-[#8a520c]";
  }

  return "bg-[#e6f3ef] text-brand";
}

function severityTone(severity: AuditSeverity): string {
  switch (severity) {
    case "critical":
      return "bg-[#fde8e5] text-danger";
    case "warning":
      return "bg-[#fff5e5] text-[#8a520c]";
    default:
      return "bg-[#e6f3ef] text-muted";
  }
}

export default async function AuditLogsPage({ searchParams }: AuditLogsPageProps) {
  await requireAdminUser(getCurrentUser, ["super_admin", "compound_admin", "support_agent"]);
  const params = searchParams ? await searchParams : {};
  const actorId = params.actorId && Number.isInteger(Number(params.actorId)) ? Number(params.actorId) : undefined;
  const page = params.page && Number.isInteger(Number(params.page)) ? Math.max(1, Number(params.page)) : 1;
  const validSeverities: AuditSeverity[] = ["info", "warning", "critical"];
  const severity = validSeverities.includes(params.severity as AuditSeverity) ? (params.severity as AuditSeverity) : undefined;

  const auditLogsPage = await getAuditLogsPage({
    action: params.action?.trim() || undefined,
    actorId,
    from: params.from || undefined,
    method: params.method || undefined,
    module: params.module?.trim() || undefined,
    page,
    perPage: 25,
    q: params.q?.trim() || undefined,
    severity,
    to: params.to || undefined,
  });
  const auditLogs = auditLogsPage.data ?? [];

  const t = await getTranslations("AuditLogs");
  const locale = await getLocale();

  // Build export URL that mirrors current filters (served via Next.js proxy route)
  const exportParams = new URLSearchParams();
  if (params.action?.trim()) exportParams.set("action", params.action.trim());
  if (actorId) exportParams.set("actorId", String(actorId));
  if (params.from) exportParams.set("from", params.from);
  if (params.method) exportParams.set("method", params.method);
  if (params.module?.trim()) exportParams.set("module", params.module.trim());
  if (params.q?.trim()) exportParams.set("q", params.q.trim());
  if (severity) exportParams.set("severity", severity);
  if (params.to) exportParams.set("to", params.to);
  const exportHref = `/api/audit-export${exportParams.toString() ? `?${exportParams.toString()}` : ""}`;

  function formatDate(value: string | null): string {
    if (!value) {
      return t("notSet");
    }

    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(new Date(value));
  }

  function metadataSummary(entry: AuditLogEntry): string {
    const keys = Object.keys(entry.metadata);

    if (keys.length === 0) {
      return t("noMetadata");
    }

    return keys.slice(0, 4).join(", ");
  }

  function severityLabel(s: AuditSeverity): string {
    switch (s) {
      case "critical":
        return t("severityCritical");
      case "warning":
        return t("severityWarning");
      default:
        return t("severityInfo");
    }
  }

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
            <p className="mt-2 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
              download
              href={exportHref}
            >
              {t("exportCsv")}
            </a>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
              href="/onboarding"
            >
              {t("onboarding")}
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        {/* Filter bar — 3 rows on mobile, 1 wide row on desktop */}
        <form className="grid gap-3 rounded-lg border border-line bg-panel p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_auto]">
          <label className="text-sm font-semibold">
            {t("search")}
            <input
              className="mt-2 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
              defaultValue={params.q ?? ""}
              name="q"
              placeholder={t("searchPlaceholder")}
            />
          </label>
          <label className="text-sm font-semibold">
            {t("action")}
            <input
              className="mt-2 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
              defaultValue={params.action ?? ""}
              name="action"
              placeholder={t("actionPlaceholder")}
            />
          </label>
          <label className="text-sm font-semibold">
            {t("module")}
            <input
              className="mt-2 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
              defaultValue={params.module ?? ""}
              name="module"
              placeholder={t("modulePlaceholder")}
            />
          </label>
          <label className="text-sm font-semibold">
            {t("severity")}
            <select
              className="mt-2 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
              defaultValue={params.severity ?? ""}
              name="severity"
            >
              {severityOptions.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {t(opt.labelKey as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            {t("method")}
            <select
              className="mt-2 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
              defaultValue={params.method ?? ""}
              name="method"
            >
              {methodOptions.map((method) => (
                <option key={method || "all"} value={method}>
                  {method || t("all")}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            {t("from")}
            <input
              className="mt-2 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
              defaultValue={params.from ?? ""}
              name="from"
              type="date"
            />
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
            <label className="min-w-0 flex-1 text-sm font-semibold">
              {t("to")}
              <input
                className="mt-2 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
                defaultValue={params.to ?? ""}
                name="to"
                type="date"
              />
            </label>
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
              type="submit"
            >
              {t("filter")}
            </button>
          </div>
          <label className="text-sm font-semibold lg:hidden">
            {t("actorId")}
            <input
              className="mt-2 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
              defaultValue={params.actorId ?? ""}
              min={1}
              name="actorId"
              type="number"
            />
          </label>
        </form>

        <div className="mt-5 overflow-hidden rounded-lg border border-line bg-panel">
          <div className="flex flex-col gap-2 border-b border-line p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t("recentActivity")}</h2>
              <p className="mt-1 text-sm text-muted">
                {t("paginationSummary", {
                  from: auditLogsPage.meta.from ?? 0,
                  to: auditLogsPage.meta.to ?? 0,
                  total: auditLogsPage.meta.total,
                })}
              </p>
            </div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/audit-logs">
              {t("clearFilters")}
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] border-collapse text-start text-sm">
              <thead className="bg-background text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">{t("colTime")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("colActor")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("action")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("colSeverity")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("colReason")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("colRequest")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("colSubject")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("colStatus")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("colMetadata")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted" colSpan={9}>
                      {t("empty")}
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((entry) => (
                    <tr key={entry.id}>
                      <td className="w-[180px] px-5 py-5 align-top text-muted">{formatDate(entry.createdAt)}</td>
                      <td className="w-[210px] px-5 py-5 align-top">
                        <div className="font-semibold">{entry.actor?.name ?? t("system")}</div>
                        <div className="text-muted">
                          {entry.actorId ? t("userId", { id: entry.actorId }) : t("noActor")}
                        </div>
                      </td>
                      <td className="w-[240px] px-5 py-5 align-top">
                        <code className="rounded-lg bg-background px-2 py-1 text-xs font-semibold">{entry.action}</code>
                      </td>
                      <td className="w-[120px] px-5 py-5 align-top">
                        <span
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${severityTone(entry.severity)}`}
                        >
                          {severityLabel(entry.severity)}
                        </span>
                      </td>
                      <td className="w-[180px] px-5 py-5 align-top text-muted">{entry.reason ?? t("noReason")}</td>
                      <td className="w-[260px] px-5 py-5 align-top">
                        <div className="font-semibold">{entry.method ?? t("na")}</div>
                        <div className="max-w-[220px] break-words text-muted">{entry.path ?? t("noPath")}</div>
                        <div className="text-muted">{entry.ipAddress ?? t("noIp")}</div>
                      </td>
                      <td className="w-[190px] px-5 py-5 align-top">
                        {entry.auditableType && entry.auditableId ? (
                          <Link
                            className="text-xs font-semibold text-brand hover:text-brand-strong"
                            href={`/audit-logs/timeline/${encodeURIComponent(entry.auditableType)}/${encodeURIComponent(entry.auditableId)}`}
                          >
                            {entry.auditableType}
                            <br />
                            <span className="text-muted">#{entry.auditableId}</span>
                          </Link>
                        ) : (
                          <span className="text-muted">{t("noSubject")}</span>
                        )}
                      </td>
                      <td className="w-[110px] px-5 py-5 align-top">
                        <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusTone(entry.statusCode)}`}>
                          {entry.statusCode ?? t("na")}
                        </span>
                      </td>
                      <td className="w-[180px] px-5 py-5 align-top text-muted">{metadataSummary(entry)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination
            basePath="/audit-logs"
            labels={{
              first: t("firstPage"),
              previous: t("previousPage"),
              next: t("nextPage"),
              last: t("lastPage"),
              summary: t("paginationSummary", {
                from: auditLogsPage.meta.from ?? 0,
                to: auditLogsPage.meta.to ?? 0,
                total: auditLogsPage.meta.total,
              }),
            }}
            meta={auditLogsPage.meta}
            params={{
              action: params.action?.trim() || undefined,
              actorId,
              from: params.from || undefined,
              method: params.method || undefined,
              module: params.module?.trim() || undefined,
              q: params.q?.trim() || undefined,
              severity,
              to: params.to || undefined,
            }}
          />
        </div>
      </section>
    </main>
  );
}
