import type { AuditLogEntry, AuditSeverity } from "@compound/contracts";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

import { getAuditTimeline, getCurrentUser } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

interface AuditTimelinePageProps {
  params: Promise<{
    entityType: string;
    entityId: string;
  }>;
}

function statusTone(statusCode: number | null): string {
  if (!statusCode) return "bg-background text-muted";
  if (statusCode >= 500) return "bg-[#fde8e5] text-danger";
  if (statusCode >= 400) return "bg-[#fff5e5] text-[#8a520c]";
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

export default async function AuditTimelinePage({ params }: AuditTimelinePageProps) {
  await requireAdminUser(getCurrentUser, ["super_admin", "compound_admin", "support_agent"]);

  const { entityType, entityId } = await params;
  const decodedType = decodeURIComponent(entityType);
  const decodedId = decodeURIComponent(entityId);

  const events = await getAuditTimeline(decodedType, decodedId);

  const t = await getTranslations("AuditTimeline");
  const locale = await getLocale();

  function formatDate(value: string | null): string {
    if (!value) return "—";
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(new Date(value));
  }

  function severityLabel(s: AuditSeverity): string {
    const tAudit = t;

    switch (s) {
      case "critical":
        return tAudit("colSeverity") + " (critical)";
      case "warning":
        return "Warning";
      default:
        return "Info";
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/audit-logs">
              {t("back")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {t("subtitle", { entityType: decodedType, entityId: decodedId })}
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        {/* Entity badge */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="rounded-lg border border-line bg-panel px-4 py-2 text-sm font-semibold">
            {decodedType}
          </span>
          <span className="text-muted">#</span>
          <span className="rounded-lg border border-line bg-panel px-4 py-2 font-mono text-sm">{decodedId}</span>
          <span className="text-sm text-muted">— {events.length} events</span>
        </div>

        {/* Timeline */}
        {events.length === 0 ? (
          <div className="rounded-lg border border-line bg-panel px-6 py-12 text-center text-muted">
            {t("empty")}
          </div>
        ) : (
          <ol className="relative border-s border-line">
            {events.map((entry: AuditLogEntry, index: number) => (
              <li key={entry.id} className="mb-6 ms-6">
                {/* Timeline dot */}
                <span
                  className={`absolute -start-2.5 mt-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-panel ${
                    entry.severity === "critical"
                      ? "bg-danger"
                      : entry.severity === "warning"
                        ? "bg-[#f59e0b]"
                        : "bg-brand"
                  }`}
                >
                  <span className="sr-only">{entry.severity}</span>
                </span>

                <div className="rounded-lg border border-line bg-panel p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted">{index + 1}.</span>
                    <span className="text-sm font-semibold text-muted">{formatDate(entry.createdAt)}</span>
                    <span
                      className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${severityTone(entry.severity)}`}
                    >
                      {severityLabel(entry.severity)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <code className="rounded bg-background px-2 py-1 text-sm font-semibold">{entry.action}</code>
                    {entry.statusCode && (
                      <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${statusTone(entry.statusCode)}`}>
                        {entry.statusCode}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    {/* Actor */}
                    <div>
                      <span className="font-semibold text-muted">{t("colActor")}: </span>
                      {entry.actor?.name ?? t("noActor")}
                    </div>

                    {/* Request */}
                    {(entry.method ?? entry.path) && (
                      <div>
                        <span className="font-semibold text-muted">{t("colRequest")}: </span>
                        {entry.method} {entry.path}
                      </div>
                    )}

                    {/* Reason */}
                    {entry.reason && (
                      <div>
                        <span className="font-semibold text-muted">{t("colReason")}: </span>
                        {entry.reason}
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  {Object.keys(entry.metadata).length > 0 && (
                    <details className="mt-2 text-xs text-muted">
                      <summary className="cursor-pointer font-semibold">Metadata</summary>
                      <pre className="mt-1 overflow-auto rounded bg-background p-2">
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
