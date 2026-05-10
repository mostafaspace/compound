import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SiteNav } from "@/components/site-nav";
import { getCurrentUser, getWorkOrders } from "@/lib/api";
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; priority?: string; category?: string }>;
}) {
  await requireAdminUser(getCurrentUser, ["super_admin", "compound_admin", "support_agent"]);

  const sp = searchParams ? await searchParams : {};
  const status   = typeof sp.status   === "string" ? sp.status   : "all";
  const priority = typeof sp.priority === "string" ? sp.priority : "";
  const category = typeof sp.category === "string" ? sp.category : "";

  const [t, workOrders] = await Promise.all([
    getTranslations("WorkOrders"),
    getWorkOrders({
      status:   status !== "all" ? status : undefined,
      priority: priority || undefined,
      category: category || undefined,
    }),
  ]);

  const openCount      = workOrders.filter((w) => !["completed", "cancelled", "rejected"].includes(w.status)).length;
  const inProgressCount = workOrders.filter((w) => w.status === "in_progress").length;
  const completedCount = workOrders.filter((w) => w.status === "completed").length;
  const urgentCount    = workOrders.filter((w) => w.priority === "urgent" && !["completed", "cancelled", "rejected"].includes(w.status)).length;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[{ label: t("title") }]} />
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 lg:px-8">
          <div>
            <h1 className="text-3xl font-semibold">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-6 px-5 py-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("stats.open")}</p>
            <p className="mt-2 text-3xl font-semibold">{openCount}</p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("stats.inProgress")}</p>
            <p className="mt-2 text-3xl font-semibold">{inProgressCount}</p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("stats.completed")}</p>
            <p className="mt-2 text-3xl font-semibold">{completedCount}</p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("stats.urgent")}</p>
            <p className="mt-2 text-3xl font-semibold text-danger">{urgentCount}</p>
          </div>
        </div>

        {/* Filters */}
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">{t("filters.status")}</label>
            <select name="status" defaultValue={status}
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
              <option value="all">{t("filters.allStatuses")}</option>
              <option value="draft">{t("status.draft")}</option>
              <option value="requested">{t("status.requested")}</option>
              <option value="quoted">{t("status.quoted")}</option>
              <option value="approved">{t("status.approved")}</option>
              <option value="in_progress">{t("status.inProgress")}</option>
              <option value="completed">{t("status.completed")}</option>
              <option value="rejected">{t("status.rejected")}</option>
              <option value="cancelled">{t("status.cancelled")}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">{t("filters.priority")}</label>
            <select name="priority" defaultValue={priority}
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
              <option value="">{t("filters.allPriorities")}</option>
              <option value="urgent">{t("priority.urgent")}</option>
              <option value="high">{t("priority.high")}</option>
              <option value="medium">{t("priority.medium")}</option>
              <option value="low">{t("priority.low")}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">{t("filters.category")}</label>
            <select name="category" defaultValue={category}
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
              <option value="">{t("filters.allCategories")}</option>
              <option value="plumbing">{t("category.plumbing")}</option>
              <option value="electrical">{t("category.electrical")}</option>
              <option value="hvac">{t("category.hvac")}</option>
              <option value="painting">{t("category.painting")}</option>
              <option value="cleaning">{t("category.cleaning")}</option>
              <option value="landscaping">{t("category.landscaping")}</option>
              <option value="security">{t("category.security")}</option>
              <option value="general">{t("category.general")}</option>
              <option value="other">{t("category.other")}</option>
            </select>
          </div>
          <button type="submit"
            className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong">
            {t("filters.apply")}
          </button>
        </form>

        {/* List */}
        {workOrders.length === 0 ? (
          <div className="rounded-lg border border-line bg-panel py-16 text-center">
            <p className="text-sm text-muted">{t("empty")}</p>
          </div>
        ) : (
          <div className="divide-y divide-line rounded-lg border border-line bg-panel">
            {workOrders.map((wo) => (
              <Link key={wo.id} href={`/work-orders/${wo.id}`}
                className="flex items-start gap-4 px-5 py-4 hover:bg-panel-hover transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold truncate">{wo.title}</span>
                    <StatusBadge status={wo.status} />
                    <PriorityBadge priority={wo.priority} />
                    <span className="inline-flex rounded-md bg-background border border-line px-2 py-0.5 text-xs text-muted capitalize">
                      {wo.category}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted">
                    {wo.vendor && <span>{t("fields.vendor")}: {wo.vendor.name}</span>}
                    {wo.estimatedCost && <span>{t("fields.estimatedCost")}: {wo.estimatedCost}</span>}
                    {wo.targetCompletionAt && (
                      <span>{t("fields.targetCompletion")}: {new Date(wo.targetCompletionAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted">
                  {new Date(wo.createdAt).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
