import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { getCurrentUser, getMeetingActionItems } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    open: "bg-[#eaf0ff] text-[#244a8f]",
    in_progress: "bg-[#e6f3ef] text-brand",
    done: "bg-[#f3f3f3] text-muted",
    cancelled: "bg-[#fff3f2] text-danger",
  };
  const cls = colorMap[status] ?? "bg-background text-muted";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default async function MeetingActionItemsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  await requireAdminUser(getCurrentUser, ["super_admin", "compound_admin", "board_member"]);

  const sp = searchParams ? await searchParams : {};
  const status = typeof sp.status === "string" ? sp.status : "all";

  const [t, items] = await Promise.all([
    getTranslations("Meetings"),
    getMeetingActionItems({ status: status !== "all" ? status : undefined }),
  ]);

  const openCount = items.filter((i) => i.status === "open").length;
  const inProgressCount = items.filter((i) => i.status === "in_progress").length;
  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/meetings">
              {t("back")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("actionItems.title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{t("actionItems.subtitle")}</p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-6 px-5 py-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("actionItems.stats.open")}</p>
            <p className="mt-2 text-3xl font-semibold">{openCount}</p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("actionItems.stats.inProgress")}</p>
            <p className="mt-2 text-3xl font-semibold">{inProgressCount}</p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("actionItems.stats.done")}</p>
            <p className="mt-2 text-3xl font-semibold">{doneCount}</p>
          </div>
        </div>

        {/* Filter */}
        <form method="GET" className="flex items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">{t("filters.status")}</label>
            <select
              name="status"
              defaultValue={status}
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="all">{t("filters.all")}</option>
              <option value="open">{t("actionItems.status.open")}</option>
              <option value="in_progress">{t("actionItems.status.inProgress")}</option>
              <option value="done">{t("actionItems.status.done")}</option>
              <option value="cancelled">{t("actionItems.status.cancelled")}</option>
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
          >
            {t("filters.apply")}
          </button>
        </form>

        {/* List */}
        {items.length === 0 ? (
          <div className="rounded-lg border border-line bg-panel py-16 text-center">
            <p className="text-sm text-muted">{t("actionItems.empty")}</p>
          </div>
        ) : (
          <div className="divide-y divide-line rounded-lg border border-line bg-panel">
            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm">{item.title}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  {item.meeting && (
                    <Link
                      href={`/meetings/${item.meeting.id}`}
                      className="mt-0.5 text-xs font-semibold text-brand hover:text-brand-strong"
                    >
                      {item.meeting.title}
                    </Link>
                  )}
                  <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted">
                    {item.assignee && <span>{t("detail.assignedTo")}: {item.assignee.name}</span>}
                    {item.dueDate && <span>{t("detail.dueDate")}: {item.dueDate}</span>}
                    {item.completedAt && (
                      <span>{t("actionItems.completedAt")}: {new Date(item.completedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
