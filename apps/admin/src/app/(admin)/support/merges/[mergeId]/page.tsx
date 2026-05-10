import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getAccountMerge } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";
import { cancelMergeAction, confirmMergeAction } from "../../actions";

interface MergeDetailPageProps {
  params: Promise<{ mergeId: string }>;
  searchParams?: Promise<{ updated?: string; created?: string }>;
}

function statusBadge(status: string): string {
  switch (status) {
    case "completed":
      return "bg-[#e6f3ef] text-brand";
    case "cancelled":
      return "bg-background text-muted";
    default:
      return "bg-[#fff5e5] text-[#8a520c]";
  }
}

export default async function MergeDetailPage({ params, searchParams }: MergeDetailPageProps) {
  await requireAdminUser(getCurrentUser, ["super_admin", "compound_admin", "support_agent"]);

  const { mergeId } = await params;
  const sp = searchParams ? await searchParams : {};
  const numericMergeId = Number(mergeId);

  const [merge, t, locale] = await Promise.all([
    getAccountMerge(numericMergeId),
    getTranslations("AccountMerges"),
    getLocale(),
  ]);

  function formatDate(value: string | null | undefined): string {
    if (!value) return "—";
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }

  if (!merge) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <p className="text-muted">Merge not found.</p>
          <Link className="mt-4 inline-block text-sm font-semibold text-brand hover:text-brand-strong" href="/support/merges">
            {t("back")}
          </Link>
        </div>
      </main>
    );
  }

  const confirmWithId = confirmMergeAction.bind(null, numericMergeId);
  const cancelWithId = cancelMergeAction.bind(null, numericMergeId);

  const analysis = merge.mergeAnalysis as Record<string, unknown> | null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/support/merges">
              {t("back")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">Merge #{merge.id}</h1>
            <p className="mt-1 text-sm text-muted">
              {formatDate(merge.createdAt)}
              {merge.initiator && ` — initiated by ${merge.initiator.name}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusBadge(merge.status)}`}>
              {merge.status === "pending" && t("statusPending")}
              {merge.status === "completed" && t("statusCompleted")}
              {merge.status === "cancelled" && t("statusCancelled")}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8 space-y-6">
        {/* Success/creation banner */}
        {(sp.updated === "completed" || sp.created === "1") && (
          <div className="rounded-lg border border-[#b7e0cb] bg-[#e6f3ef] px-4 py-3 text-sm font-semibold text-brand">
            {sp.created === "1"
              ? "Merge initiated. Review the analysis below and confirm when ready."
              : "Merge completed. Source account has been archived."}
          </div>
        )}
        {sp.updated === "cancelled" && (
          <div className="rounded-lg border border-line bg-background px-4 py-3 text-sm font-semibold text-muted">
            Merge cancelled.
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Source account */}
          <div className="rounded-lg border border-line bg-panel p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">{t("colSource")}</h2>
            {merge.sourceUser ? (
              <div className="space-y-2 text-sm">
                <p className="font-semibold">{merge.sourceUser.name}</p>
                <p className="text-muted">{merge.sourceUser.email}</p>
                <p className="text-muted">Status: {merge.sourceUser.status}</p>
                <Link
                  className="inline-block text-xs font-semibold text-brand hover:text-brand-strong"
                  href={`/support/users/${merge.sourceUser.id}`}
                >
                  View profile →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted">—</p>
            )}
          </div>

          {/* Target account */}
          <div className="rounded-lg border border-line bg-panel p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">{t("colTarget")}</h2>
            {merge.targetUser ? (
              <div className="space-y-2 text-sm">
                <p className="font-semibold">{merge.targetUser.name}</p>
                <p className="text-muted">{merge.targetUser.email}</p>
                <p className="text-muted">Status: {merge.targetUser.status}</p>
                <Link
                  className="inline-block text-xs font-semibold text-brand hover:text-brand-strong"
                  href={`/support/users/${merge.targetUser.id}`}
                >
                  View profile →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted">—</p>
            )}
          </div>
        </div>

        {/* Notes */}
        {merge.notes && (
          <div className="rounded-lg border border-line bg-panel p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Notes</h2>
            <p className="text-sm">{merge.notes}</p>
          </div>
        )}

        {/* Merge analysis */}
        {analysis && (
          <div className="rounded-lg border border-line bg-panel p-5">
            <h2 className="mb-4 text-sm font-semibold">{t("analysis")}</h2>
            <div className="space-y-3 text-sm">
              {Object.entries(analysis).map(([key, value]) => {
                if (key === "warnings") return null;
                return (
                  <div className="flex items-start justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0" key={key}>
                    <span className="capitalize text-muted">{key.replace(/_/g, " ")}</span>
                    <span className="font-semibold">
                      {Array.isArray(value) ? value.length : typeof value === "object" ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                );
              })}

              {/* Warnings */}
              {Array.isArray(analysis.warnings) && (
                <div className="mt-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("warnings")}</h3>
                  {(analysis.warnings as string[]).length === 0 ? (
                    <p className="text-muted">{t("noWarnings")}</p>
                  ) : (
                    <ul className="space-y-1">
                      {(analysis.warnings as string[]).map((w, i) => (
                        <li className="flex items-start gap-2 text-[#8a520c]" key={i}>
                          <span className="mt-0.5 text-xs">⚠</span>
                          {w}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Confirm / cancel actions */}
        {merge.status === "pending" && (
          <div className="rounded-lg border border-[#fde8e5] bg-[#fef9f9] p-5">
            <p className="mb-4 text-sm text-foreground">{t("mergeWarning")}</p>
            <div className="flex flex-wrap gap-3">
              <form action={confirmWithId}>
                <button
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-strong"
                  type="submit"
                >
                  {t("confirmMerge")}
                </button>
              </form>
              <form action={cancelWithId}>
                <button
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-danger bg-panel px-5 text-sm font-semibold text-danger hover:bg-[#fde8e5]"
                  type="submit"
                >
                  {t("cancelMerge")}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Completion details */}
        {merge.status === "completed" && merge.completedAt && (
          <div className="rounded-lg border border-line bg-panel p-5 text-sm">
            <span className="text-muted">Completed: </span>
            <span className="font-semibold">{formatDate(merge.completedAt)}</span>
          </div>
        )}
        {merge.status === "cancelled" && merge.cancelledAt && (
          <div className="rounded-lg border border-line bg-panel p-5 text-sm">
            <span className="text-muted">Cancelled: </span>
            <span className="font-semibold">{formatDate(merge.cancelledAt)}</span>
          </div>
        )}
      </section>
    </main>
  );
}
