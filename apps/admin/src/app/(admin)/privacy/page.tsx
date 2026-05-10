import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getDataExportRequests } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

// ─── Status badge ─────────────────────────────────────────────────────────────

function ExportStatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pending:    "bg-[#eaf0ff] text-[#244a8f]",
    processing: "bg-[#f3ead7] text-[#8a520c]",
    ready:      "bg-[#e6f3ef] text-brand",
    failed:     "bg-[#fff3f2] text-danger",
    expired:    "bg-[#f3f3f3] text-muted",
  };
  const cls = colorMap[status] ?? "bg-background text-muted";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

// ─── Info card ────────────────────────────────────────────────────────────────

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {children}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function PrivacyPage() {
  await requireAdminUser(getCurrentUser, ["super_admin", "compound_admin"]);

  const [t, exportRequests] = await Promise.all([
    getTranslations("Privacy"),
    getDataExportRequests(),
  ]);

  const pendingCount = exportRequests.filter((r) => r.status === "pending").length;
  const readyCount   = exportRequests.filter((r) => r.status === "ready").length;

  return (
    <main className="min-h-screen bg-background text-foreground">
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
        {/* Overview cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InfoCard title={t("overview.consent")}>
            <p className="text-sm text-muted">{t("overview.consentDesc")}</p>
            <p className="mt-2 text-xs text-muted">{t("overview.apiNote")}</p>
          </InfoCard>

          <InfoCard title={t("overview.exportRequests")}>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-semibold">{pendingCount}</span>
              <span className="text-sm text-muted">{t("overview.pendingExports")}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-xl font-semibold text-brand">{readyCount}</span>
              <span className="text-sm text-muted">{t("overview.readyExports")}</span>
            </div>
          </InfoCard>

          <InfoCard title={t("overview.legalHold")}>
            <p className="text-sm text-muted">{t("overview.legalHoldDesc")}</p>
            <p className="mt-2 text-xs text-muted">{t("overview.manageViaSupport")}</p>
          </InfoCard>
        </div>

        {/* Policy types reference */}
        <InfoCard title={t("policies.title")}>
          <div className="divide-y divide-line">
            {[
              { type: "privacy_policy",   label: t("policies.privacyPolicy"),   desc: t("policies.privacyPolicyDesc") },
              { type: "terms_of_service", label: t("policies.termsOfService"),  desc: t("policies.termsDesc") },
              { type: "data_processing",  label: t("policies.dataProcessing"),  desc: t("policies.dataProcessingDesc") },
            ].map((policy) => (
              <div key={policy.type} className="py-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{policy.label}</span>
                  <span className="inline-flex rounded bg-background border border-line px-2 py-0.5 text-xs text-muted font-mono">
                    {policy.type}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted">{policy.desc}</p>
              </div>
            ))}
          </div>
        </InfoCard>

        {/* Export requests */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {t("exportRequests.title")}
          </h2>
          {exportRequests.length === 0 ? (
            <div className="rounded-lg border border-line bg-panel py-12 text-center">
              <p className="text-sm text-muted">{t("exportRequests.empty")}</p>
            </div>
          ) : (
            <div className="divide-y divide-line rounded-lg border border-line bg-panel">
              {exportRequests.map((req) => (
                <div key={req.id} className="flex items-start gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm">{req.subject?.name ?? `User #${req.userId}`}</span>
                      <ExportStatusBadge status={req.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {t("exportRequests.requestedBy")}: {req.requester?.name ?? "—"} ·{" "}
                      {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                    {req.modules && (
                      <p className="mt-0.5 text-xs text-muted">
                        {t("exportRequests.modules")}: {req.modules.join(", ")}
                      </p>
                    )}
                    {req.processedAt && (
                      <p className="mt-0.5 text-xs text-muted">
                        {t("exportRequests.processedAt")}: {new Date(req.processedAt).toLocaleDateString()}
                        {req.processor && <> · {req.processor.name}</>}
                      </p>
                    )}
                  </div>
                  {req.expiresAt && (
                    <span className="shrink-0 text-xs text-muted">
                      {t("exportRequests.expires")}: {new Date(req.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Retention & anonymization info */}
        <InfoCard title={t("retention.title")}>
          <div className="space-y-3 text-sm text-muted">
            <p>{t("retention.desc1")}</p>
            <p>{t("retention.desc2")}</p>
            <p>{t("retention.desc3")}</p>
          </div>
        </InfoCard>
      </section>
    </main>
  );
}
