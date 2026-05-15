import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AdminPagination } from "@/components/admin-pagination";
import { SiteNav } from "@/components/site-nav";
import { getCurrentUser, getMeetingActionItems, getMeetingsPage } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

// ─── Badge ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    draft: "bg-background text-muted border border-line",
    scheduled: "bg-[#eaf0ff] text-[#244a8f]",
    in_progress: "bg-[#e6f3ef] text-brand",
    completed: "bg-[#f3f3f3] text-muted",
    cancelled: "bg-[#fff3f2] text-danger",
  };
  const cls = colorMap[status] ?? "bg-background text-muted";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function ScopeBadge({ scope }: { scope: string }) {
  const colorMap: Record<string, string> = {
    association: "bg-[#eaf0ff] text-[#244a8f]",
    building: "bg-[#f3ead7] text-[#8a520c]",
    floor: "bg-[#e6f3ef] text-brand",
    committee: "bg-background text-muted border border-line",
  };
  const cls = colorMap[scope] ?? "bg-background text-muted";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {scope}
    </span>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; status?: string; scope?: string }>;
}) {
  await requireAdminUser(getCurrentUser, ["super_admin", "compound_admin", "board_member"]);

  const sp = searchParams ? await searchParams : {};
  const status = typeof sp.status === "string" ? sp.status : "all";
  const scope = typeof sp.scope === "string" ? sp.scope : "";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const [t, commonT, meetingsPage, actionItems] = await Promise.all([
    getTranslations("Meetings"),
    getTranslations("Common"),
    getMeetingsPage({ page, status: status !== "all" ? status : undefined, scope: scope || undefined }),
    getMeetingActionItems({ status: "open" }),
  ]);
  const meetings = meetingsPage.data;

  const draftCount = meetings.filter((m) => m.status === "draft").length;
  const scheduledCount = meetings.filter((m) => m.status === "scheduled").length;
  const inProgressCount = meetings.filter((m) => m.status === "in_progress").length;
  const openActionItems = actionItems.length;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[{ label: t("title") }]} />
      {/* Header */}
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
            <Link
              href="/meetings/action-items"
              className="inline-flex h-10 items-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold transition hover:border-brand"
            >
              {t("nav.actionItems")}
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-6 px-5 py-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("stats.draft")}</p>
            <p className="mt-2 text-3xl font-semibold">{draftCount}</p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("stats.scheduled")}</p>
            <p className="mt-2 text-3xl font-semibold">{scheduledCount}</p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("stats.inProgress")}</p>
            <p className="mt-2 text-3xl font-semibold">{inProgressCount}</p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("stats.openActionItems")}</p>
            <p className="mt-2 text-3xl font-semibold">{openActionItems}</p>
          </div>
        </div>

        {/* Filters */}
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">{t("filters.status")}</label>
            <select
              name="status"
              defaultValue={status}
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="all">{t("filters.all")}</option>
              <option value="draft">{t("status.draft")}</option>
              <option value="scheduled">{t("status.scheduled")}</option>
              <option value="in_progress">{t("status.inProgress")}</option>
              <option value="completed">{t("status.completed")}</option>
              <option value="cancelled">{t("status.cancelled")}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">{t("filters.scope")}</label>
            <select
              name="scope"
              defaultValue={scope}
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">{t("filters.allScopes")}</option>
              <option value="association">{t("scope.association")}</option>
              <option value="building">{t("scope.building")}</option>
              <option value="floor">{t("scope.floor")}</option>
              <option value="committee">{t("scope.committee")}</option>
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
          >
            {t("filters.apply")}
          </button>
        </form>

        {/* Meeting list */}
        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          <div className="border-b border-line px-5 py-3 text-sm text-muted">
            {commonT("pagination.summary", {
              from: meetingsPage.meta.from ?? 0,
              to: meetingsPage.meta.to ?? 0,
              total: meetingsPage.meta.total,
            })}
          </div>
          {meetings.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted">{t("empty")}</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {meetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/meetings/${meeting.id}`}
                  className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-panel-hover"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold">{meeting.title}</span>
                      <StatusBadge status={meeting.status} />
                      <ScopeBadge scope={meeting.scope} />
                    </div>
                    {meeting.scheduledAt && (
                      <p className="mt-1 text-xs text-muted">
                        {t("fields.scheduledAt")}: {new Date(meeting.scheduledAt).toLocaleString()}
                      </p>
                    )}
                    {meeting.location && (
                      <p className="mt-0.5 text-xs text-muted">
                        {t("fields.location")}: {meeting.location}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted">
                    {new Date(meeting.createdAt).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
          <AdminPagination
            basePath="/meetings"
            labels={{
              first: commonT("pagination.first"),
              last: commonT("pagination.last"),
              next: commonT("pagination.next"),
              previous: commonT("pagination.previous"),
              summary: commonT("pagination.summary", {
                from: meetingsPage.meta.from ?? 0,
                to: meetingsPage.meta.to ?? 0,
                total: meetingsPage.meta.total,
              }),
            }}
            meta={meetingsPage.meta}
            params={{
              scope: scope || undefined,
              status: status !== "all" ? status : undefined,
            }}
          />
        </div>
      </section>
    </main>
  );
}
