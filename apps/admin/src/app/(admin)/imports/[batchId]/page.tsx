import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getImportBatch } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

interface BatchDetailPageProps {
  params: Promise<{ batchId: string }>;
}

export default async function ImportBatchDetailPage({ params }: BatchDetailPageProps) {
  await requireAdminUser(getCurrentUser);
  const { batchId } = await params;
  const t = await getTranslations("Import");

  const batch = await getImportBatch(batchId);
  if (!batch) notFound();

  const statusColors: Record<string, string> = {
    completed: "text-brand bg-[#e6f3ef]",
    failed: "text-danger bg-[#fef2f2]",
    processing: "text-[#7a5d1a] bg-[#fff8e8]",
    pending: "text-muted bg-background",
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link
              className="text-sm font-semibold text-brand hover:text-brand-strong"
              href="/imports"
            >
              {t("title")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("result.title")}</h1>
            <p className="mt-2 font-mono text-sm text-muted">{batch.originalFilename}</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 lg:px-8 space-y-6">
        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <article className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-medium text-muted">{t("result.created")}</p>
            <p className="mt-2 text-3xl font-semibold text-brand">{batch.createdCount}</p>
          </article>
          <article className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-medium text-muted">{t("result.updated")}</p>
            <p className="mt-2 text-3xl font-semibold text-accent">{batch.updatedCount}</p>
          </article>
          <article className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-medium text-muted">{t("result.skipped")}</p>
            <p className="mt-2 text-3xl font-semibold">{batch.skippedCount}</p>
          </article>
          <article className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-medium text-muted">{t("result.errors")}</p>
            <p className="mt-2 text-3xl font-semibold text-danger">{batch.errorCount}</p>
          </article>
        </div>

        {/* Metadata */}
        <div className="rounded-lg border border-line bg-panel p-5 text-sm space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <span className="text-muted">{t("typeLabel")}</span>
            <span className="font-semibold">{batch.typeLabel}</span>
          </div>
          <div className="flex items-center justify-between border-b border-line pb-3">
            <span className="text-muted">{t("history.status")}</span>
            <span
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${statusColors[batch.status] ?? ""}`}
            >
              {t(`statuses.${batch.status}` as Parameters<typeof t>[0])}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-line pb-3">
            <span className="text-muted">{t("result.dryRun")}</span>
            <span className="font-semibold">{batch.isDryRun ? t("result.yes") : t("result.no")}</span>
          </div>
          <div className="flex items-center justify-between border-b border-line pb-3">
            <span className="text-muted">{t("result.totalRows")}</span>
            <span className="font-semibold">{batch.totalRows}</span>
          </div>
          {batch.compound && (
            <div className="flex items-center justify-between">
              <span className="text-muted">{t("compoundLabel")}</span>
              <span className="font-semibold">{batch.compound.name}</span>
            </div>
          )}
        </div>

        {/* Row errors table */}
        <div>
          <h2 className="mb-3 text-lg font-semibold">{t("errors.title")}</h2>
          {!batch.errors || batch.errors.length === 0 ? (
            <p className="text-sm text-muted">{t("errors.none")}</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-line bg-panel">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-background text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{t("errors.row")}</th>
                    <th className="px-4 py-3 font-semibold">{t("errors.field")}</th>
                    <th className="px-4 py-3 font-semibold">{t("errors.message")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {batch.errors.map((err, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 font-mono text-xs">{err.row}</td>
                      <td className="px-4 py-3 font-mono text-xs">{err.field ?? "—"}</td>
                      <td className="px-4 py-3 text-danger">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
