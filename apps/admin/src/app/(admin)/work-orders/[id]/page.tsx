import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { getCurrentUser, getWorkOrder } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

// ─── Badges ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    draft:       "bg-background text-muted border border-line",
    requested:   "bg-[#eaf0ff] text-[#244a8f]",
    quoted:      "bg-[#f3ead7] text-[#8a520c]",
    approved:    "bg-[#e6f3ef] text-brand",
    scheduled:   "bg-[#eaf0ff] text-[#244a8f]",
    in_progress: "bg-[#e6f3ef] text-brand",
    completed:   "bg-[#f3f3f3] text-muted",
    rejected:    "bg-[#fff3f2] text-danger",
    cancelled:   "bg-[#fff3f2] text-danger",
  };
  const cls = colorMap[status] ?? "bg-background text-muted";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colorMap: Record<string, string> = {
    low:    "bg-[#f3f3f3] text-muted",
    medium: "bg-[#eaf0ff] text-[#244a8f]",
    high:   "bg-[#f3ead7] text-[#8a520c]",
    urgent: "bg-[#fff3f2] text-danger",
  };
  const cls = colorMap[priority] ?? "bg-background text-muted";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {priority}
    </span>
  );
}

function EstimateBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pending:  "bg-background text-muted border border-line",
    approved: "bg-[#e6f3ef] text-brand",
    rejected: "bg-[#fff3f2] text-danger",
  };
  const cls = colorMap[status] ?? "bg-background text-muted";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <div className="rounded-lg border border-line bg-panel">{children}</div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WorkOrderDetailPage({ params }: Props) {
  await requireAdminUser(getCurrentUser, ["super_admin", "compound_admin", "support_agent"]);

  const { id } = await params;
  const [t, workOrder] = await Promise.all([
    getTranslations("WorkOrders"),
    getWorkOrder(id),
  ]);

  if (!workOrder) notFound();

  const estimates = workOrder.estimates ?? [];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/work-orders">
              {t("detail.back")}
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold">{workOrder.title}</h1>
              <StatusBadge status={workOrder.status} />
              <PriorityBadge priority={workOrder.priority} />
            </div>
            <p className="mt-1 text-sm text-muted capitalize">{workOrder.category}</p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-6 px-5 py-6 lg:px-8">
        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("fields.vendor")}</p>
            <p className="mt-1 text-sm font-medium">{workOrder.vendor?.name ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("fields.estimatedCost")}</p>
            <p className="mt-1 text-sm font-medium">{workOrder.estimatedCost ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("fields.approvedCost")}</p>
            <p className="mt-1 text-sm font-medium">{workOrder.approvedCost ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("fields.actualCost")}</p>
            <p className="mt-1 text-sm font-medium">{workOrder.actualCost ?? "—"}</p>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("fields.createdBy")}</p>
            <p className="mt-1 text-sm font-medium">{workOrder.creator?.name ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("fields.assignee")}</p>
            <p className="mt-1 text-sm font-medium">{workOrder.assignee?.name ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("fields.targetCompletion")}</p>
            <p className="mt-1 text-sm font-medium">
              {workOrder.targetCompletionAt ? new Date(workOrder.targetCompletionAt).toLocaleDateString() : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("fields.completedAt")}</p>
            <p className="mt-1 text-sm font-medium">
              {workOrder.completedAt ? new Date(workOrder.completedAt).toLocaleDateString() : "—"}
            </p>
          </div>
        </div>

        {/* Description */}
        {workOrder.description && (
          <div className="rounded-lg border border-line bg-panel p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{t("fields.description")}</h2>
            <p className="text-sm whitespace-pre-wrap">{workOrder.description}</p>
          </div>
        )}

        {/* Linked issue */}
        {workOrder.issue && (
          <div className="rounded-lg border border-line bg-panel p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{t("detail.linkedIssue")}</h2>
            <p className="text-sm font-medium">{workOrder.issue.title}</p>
          </div>
        )}

        {/* Rejection reason */}
        {workOrder.rejectionReason && (
          <div className="rounded-lg border border-[#ffbab8] bg-[#fff3f2] p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-danger">{t("detail.rejectionReason")}</h2>
            <p className="text-sm">{workOrder.rejectionReason}</p>
          </div>
        )}

        {/* Completion notes */}
        {workOrder.completionNotes && (
          <div className="rounded-lg border border-line bg-panel p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{t("detail.completionNotes")}</h2>
            <p className="text-sm whitespace-pre-wrap">{workOrder.completionNotes}</p>
          </div>
        )}

        {/* Estimates */}
        {estimates.length > 0 && (
          <Section title={t("detail.estimates")}>
            {estimates.map((est) => (
              <div key={est.id} className="flex items-start gap-4 border-b border-line last:border-0 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm">{est.vendor?.name ?? t("detail.unknownVendor")}</span>
                    <EstimateBadge status={est.status} />
                  </div>
                  <p className="mt-0.5 text-sm font-medium">{est.amount}</p>
                  {est.notes && <p className="mt-0.5 text-xs text-muted">{est.notes}</p>}
                  {est.reviewNotes && <p className="mt-0.5 text-xs text-muted italic">{est.reviewNotes}</p>}
                  <p className="mt-1 text-xs text-muted">
                    {t("detail.submittedBy")}: {est.submitter?.name ?? "—"}
                    {est.reviewer && <> · {t("detail.reviewedBy")}: {est.reviewer.name}</>}
                  </p>
                </div>
              </div>
            ))}
          </Section>
        )}
      </section>
    </main>
  );
}
