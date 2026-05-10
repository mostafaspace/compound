import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getImportBatches, getImportTemplateUrl, getCompounds } from "@/lib/api";
import { requireAdminUser, getCompoundContext, hasEffectiveRole } from "@/lib/session";
import type { ImportBatchType } from "@compound/contracts";
import { importBatchTypeValues } from "@compound/contracts";

import { ImportForm } from "./import-form";

export default async function ImportsPage() {
  const user = await requireAdminUser(getCurrentUser);
  const t = await getTranslations("Import");
  const nav = await getTranslations("Navigation");

  const isSuperAdmin = hasEffectiveRole(user, "super_admin");

  const [batches, compoundsData, compoundCtx] = await Promise.all([
    getImportBatches(),
    getCompounds(),
    getCompoundContext(),
  ]);

  const compounds = compoundsData ?? [];

  // For scoped admins, pick the cookie context or the first compound in the list
  const defaultCompoundId = isSuperAdmin
    ? (compoundCtx ?? undefined)
    : (compoundCtx ?? compounds[0]?.id);

  const statusColors: Record<string, string> = {
    completed: "bg-[#e6f3ef] text-brand",
    failed: "bg-[#fef2f2] text-danger",
    processing: "bg-[#fff8e8] text-[#7a5d1a]",
    pending: "bg-background text-muted",
  };

  const typeValues = importBatchTypeValues as readonly ImportBatchType[];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link
              className="text-sm font-semibold text-brand hover:text-brand-strong"
              href="/"
            >
              {nav("dashboard")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("title")}</h1>
            <p className="mt-2 text-sm text-muted">{t("subtitle")}</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[1fr_1.4fr]">
          {/* Left: Templates + Form */}
          <div className="space-y-6">
            {/* Template downloads */}
            <section className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-lg font-semibold">{t("templates.title")}</h2>
              <p className="mt-1 text-sm text-muted">{t("templates.subtitle")}</p>
              <ul className="mt-4 space-y-2">
                {typeValues.map((type) => (
                  <li key={type}>
                    <a
                      href={getImportTemplateUrl(type)}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-background px-3 text-sm font-semibold hover:border-brand"
                      download
                    >
                      ↓ {t(`templates.${type}` as Parameters<typeof t>[0])}
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            {/* Import form */}
            <section>
              <h2 className="mb-4 text-lg font-semibold">{t("newImport")}</h2>
              <ImportForm
                compounds={compounds.map((c) => ({ id: c.id, name: c.name }))}
                defaultCompoundId={defaultCompoundId}
                isSuperAdmin={isSuperAdmin}
                t={{
                  startImport: t("startImport"),
                  runImport: t("runImport"),
                  dryRunLabel: t("dryRunLabel"),
                  dryRunNote: t("dryRunNote"),
                  compoundLabel: t("compoundLabel"),
                  typeLabel: t("typeLabel"),
                  fileLabel: t("fileLabel"),
                  types: {
                    units: t("types.units"),
                    users: t("types.users"),
                    opening_balances: t("types.opening_balances"),
                  },
                  messages: {
                    success: t("messages.success"),
                    dryRunSuccess: t("messages.dryRunSuccess"),
                    failed: t("messages.failed"),
                  },
                  result: {
                    title: t("result.title"),
                    created: t("result.created"),
                    updated: t("result.updated"),
                    skipped: t("result.skipped"),
                    errors: t("result.errors"),
                    totalRows: t("result.totalRows"),
                    dryRun: t("result.dryRun"),
                    yes: t("result.yes"),
                    no: t("result.no"),
                  },
                  errors: {
                    title: t("errors.title"),
                    row: t("errors.row"),
                    field: t("errors.field"),
                    message: t("errors.message"),
                    none: t("errors.none"),
                  },
                }}
              />
            </section>
          </div>

          {/* Right: Import history */}
          <section>
            <h2 className="mb-4 text-lg font-semibold">{t("history.title")}</h2>
            {batches.length === 0 ? (
              <p className="text-sm text-muted">{t("history.empty")}</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-line bg-panel">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-background text-muted">
                    <tr>
                      <th className="px-4 py-3 font-semibold">{t("history.filename")}</th>
                      <th className="px-4 py-3 font-semibold">{t("history.type")}</th>
                      <th className="px-4 py-3 font-semibold">{t("history.status")}</th>
                      <th className="px-4 py-3 font-semibold">{t("history.rows")}</th>
                      <th className="px-4 py-3 font-semibold">{t("history.dryRun")}</th>
                      <th className="px-4 py-3 font-semibold">{t("history.view")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {batches.map((batch) => (
                      <tr key={batch.id}>
                        <td className="px-4 py-3 font-mono text-xs max-w-[180px] truncate">
                          {batch.originalFilename}
                        </td>
                        <td className="px-4 py-3">{batch.typeLabel}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${statusColors[batch.status] ?? "bg-background text-muted"}`}
                          >
                            {t(`statuses.${batch.status}` as Parameters<typeof t>[0])}
                          </span>
                        </td>
                        <td className="px-4 py-3">{batch.totalRows}</td>
                        <td className="px-4 py-3">{batch.isDryRun ? t("result.yes") : t("result.no")}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/imports/${batch.id}`}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-line px-3 text-xs font-semibold hover:border-brand"
                          >
                            {t("history.view")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
