import type { AuthenticatedUser } from "@compound/contracts";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

import { AdminUserPicker } from "@/components/admin-user-picker";
import { getCurrentUser, getUserDuplicates, getUsers, getUserSupportView } from "@/lib/api";
import { toAdminUserOption } from "@/lib/admin-user-options";
import { formatRoleLabel, getPrimaryEffectiveRole } from "@/lib/auth-access";
import { requireAdminUser } from "@/lib/session";
import {
  moveOutUserAction,
  reactivateUserAction,
  recoverUserAction,
  suspendUserAction,
  initiateMergeAction,
} from "../../actions";

interface SupportUserDetailPageProps {
  params: Promise<{ userId: string }>;
  searchParams?: Promise<{ updated?: string }>;
}

function statusBadge(status: string): string {
  switch (status) {
    case "suspended":
      return "bg-[#fde8e5] text-danger";
    case "archived":
      return "bg-background text-muted";
    case "active":
      return "bg-[#e6f3ef] text-brand";
    default:
      return "bg-[#fff5e5] text-[#8a520c]";
  }
}

function statusSeverityDot(severity: string): string {
  switch (severity) {
    case "critical":
      return "bg-danger";
    case "warning":
      return "bg-[#f59e0b]";
    default:
      return "bg-[#3b82f6]";
  }
}

export default async function SupportUserDetailPage({ params, searchParams }: SupportUserDetailPageProps) {
  await requireAdminUser(getCurrentUser, ["super_admin", "compound_admin", "support_agent"]);

  const { userId } = await params;
  const sp = searchParams ? await searchParams : {};
  const numericUserId = Number(userId);

  const [view, duplicates, mergeTargetUsers, t, locale] = await Promise.all([
    getUserSupportView(numericUserId),
    getUserDuplicates(numericUserId),
    getUsers({ perPage: 100 }),
    getTranslations("UserDetail"),
    getLocale(),
  ]);

  function formatDate(value: string | null | undefined): string {
    if (!value) return t("na");
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
  }

  if (!view) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <p className="text-muted">User not found.</p>
          <Link className="mt-4 inline-block text-sm font-semibold text-brand hover:text-brand-strong" href="/support/users">
            {t("back")}
          </Link>
        </div>
      </main>
    );
  }

  const { user, memberships, documentCounts, verificationStatus, recentAuditEvents, activeMerges } = view;

  const suspendWithId = suspendUserAction.bind(null, numericUserId);
  const reactivateWithId = reactivateUserAction.bind(null, numericUserId);
  const moveOutWithId = moveOutUserAction.bind(null, numericUserId);
  const recoverWithId = recoverUserAction.bind(null, numericUserId);

  const updatedKey = sp.updated;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/support/users">
              {t("back")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{user.name}</h1>
            <p className="mt-1 text-sm text-muted">{user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusBadge(user.status)}`}>
              {user.status}
            </span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8 space-y-6">
        {/* Success banner */}
        {updatedKey && (
          <div className="rounded-lg border border-[#b7e0cb] bg-[#e6f3ef] px-4 py-3 text-sm font-semibold text-brand">
            {updatedKey === "suspended" && t("updatedSuspended")}
            {updatedKey === "reactivated" && t("updatedReactivated")}
            {updatedKey === "moved-out" && t("updatedMovedOut")}
            {updatedKey === "recovered" && t("updatedRecovered")}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ── Left column: profile + lifecycle actions ── */}
          <div className="space-y-6 lg:col-span-1">
            {/* Profile card */}
            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">{t("profileTitle")}</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">ID</dt>
                  <dd className="font-mono font-semibold">{user.id}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Role</dt>
                  <dd className="font-semibold">{formatRoleLabel(getPrimaryEffectiveRole(user))}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Status</dt>
                  <dd>
                    <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${statusBadge(user.status)}`}>
                      {user.status}
                    </span>
                  </dd>
                </div>
                {verificationStatus && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Verification</dt>
                    <dd className="font-semibold">{verificationStatus}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Last login</dt>
                  <dd className="font-semibold">{formatDate(user.lastLoginAt)}</dd>
                </div>
              </dl>
            </div>

            {/* Lifecycle actions */}
            <div className="rounded-lg border border-line bg-panel p-5 space-y-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("actionsSectionTitle")}</h2>

              {/* Suspend */}
              {user.status !== "suspended" && user.status !== "archived" && (
                <details className="group">
                  <summary className="cursor-pointer select-none text-sm font-semibold text-danger hover:underline">
                    {t("suspend")}
                  </summary>
                  <form action={suspendWithId} className="mt-3 space-y-3">
                    <label className="block text-sm font-semibold">
                      {t("reasonLabel")}
                      <textarea
                        className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                        name="reason"
                        placeholder={t("reasonPlaceholder")}
                        required
                        rows={3}
                      />
                    </label>
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-danger px-4 text-sm font-semibold text-white hover:opacity-90"
                      type="submit"
                    >
                      {t("submitSuspend")}
                    </button>
                  </form>
                </details>
              )}

              {/* Reactivate */}
              {user.status === "suspended" && (
                <details className="group">
                  <summary className="cursor-pointer select-none text-sm font-semibold text-brand hover:underline">
                    {t("reactivate")}
                  </summary>
                  <form action={reactivateWithId} className="mt-3 space-y-3">
                    <label className="block text-sm font-semibold">
                      {t("reasonLabel")}
                      <textarea
                        className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                        name="reason"
                        placeholder={t("reasonPlaceholder")}
                        rows={3}
                      />
                    </label>
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                      type="submit"
                    >
                      {t("submitReactivate")}
                    </button>
                  </form>
                </details>
              )}

              {/* Move out */}
              {memberships.some((m) => !m.endsAt) && (
                <details className="group">
                  <summary className="cursor-pointer select-none text-sm font-semibold text-[#8a520c] hover:underline">
                    {t("moveOut")}
                  </summary>
                  <form action={moveOutWithId} className="mt-3 space-y-3">
                    <label className="block text-sm font-semibold">
                      {t("reasonLabel")}
                      <textarea
                        className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                        name="reason"
                        placeholder={t("reasonPlaceholder")}
                        required
                        rows={3}
                      />
                    </label>
                    <label className="block text-sm font-semibold">
                      {t("effectiveDateLabel")}
                      <input
                        className="mt-1 h-9 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
                        name="effective_date"
                        type="date"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input className="rounded" name="archive_account" type="checkbox" value="true" />
                      {t("archiveAccountLabel")}
                    </label>
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-[#8a520c] px-4 text-sm font-semibold text-white hover:opacity-90"
                      type="submit"
                    >
                      {t("submitMoveOut")}
                    </button>
                  </form>
                </details>
              )}

              {/* Recover */}
              {user.status === "archived" && (
                <details className="group">
                  <summary className="cursor-pointer select-none text-sm font-semibold text-brand hover:underline">
                    {t("recover")}
                  </summary>
                  <form action={recoverWithId} className="mt-3 space-y-3">
                    <label className="block text-sm font-semibold">
                      {t("reasonLabel")}
                      <textarea
                        className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                        name="reason"
                        placeholder={t("reasonPlaceholder")}
                        required
                        rows={3}
                      />
                    </label>
                    <label className="block text-sm font-semibold">
                      Name (optional override)
                      <input
                        className="mt-1 h-9 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
                        name="name"
                        type="text"
                      />
                    </label>
                    <label className="block text-sm font-semibold">
                      Email (optional override)
                      <input
                        className="mt-1 h-9 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
                        name="email"
                        type="email"
                      />
                    </label>
                    <label className="block text-sm font-semibold">
                      Phone (optional override)
                      <input
                        className="mt-1 h-9 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
                        name="phone"
                        type="tel"
                      />
                    </label>
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                      type="submit"
                    >
                      {t("submitRecover")}
                    </button>
                  </form>
                </details>
              )}

              {/* Initiate merge */}
              <details className="group">
                <summary className="cursor-pointer select-none text-sm font-semibold text-muted hover:underline">
                  {t("initiateMerge")}
                </summary>
                <form action={initiateMergeAction} className="mt-3 space-y-3">
                  <input name="source_user_id" type="hidden" value={user.id} />
                  <AdminUserPicker
                    excludeUserId={user.id}
                    initialUsers={mergeTargetUsers.map(toAdminUserOption)}
                    label={t("mergeTargetLabel")}
                    name="target_user_id"
                    placeholder={t("mergeTargetPlaceholder")}
                    required
                    helperText={t("mergeTargetHelper")}
                  />
                  <label className="block text-sm font-semibold">
                    {t("mergeNotesLabel")}
                    <textarea
                      className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                      name="notes"
                      rows={2}
                    />
                  </label>
                  <button
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
                    type="submit"
                  >
                    {t("submitMerge")}
                  </button>
                </form>
              </details>
            </div>
          </div>

          {/* ── Right column: memberships, documents, audit, merges ── */}
          <div className="space-y-6 lg:col-span-2">
            {/* Unit memberships */}
            <div className="rounded-lg border border-line bg-panel overflow-hidden">
              <div className="border-b border-line px-5 py-4">
                <h2 className="text-sm font-semibold">{t("membershipsTitle")}</h2>
              </div>
              {memberships.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted">{t("noMemberships")}</p>
              ) : (
                <div className="divide-y divide-line">
                  {memberships.map((m) => (
                    <div className="flex items-center justify-between gap-4 px-5 py-3 text-sm" key={m.id}>
                      <div>
                        <p className="font-semibold">{m.unitNumber ?? m.unitName ?? m.unitId}</p>
                        <p className="text-muted">{m.relationType ?? "—"}</p>
                      </div>
                      <div className="text-end text-muted">
                        <p>{formatDate(m.startsAt)} → {m.endsAt ? formatDate(m.endsAt) : "active"}</p>
                        {m.verificationStatus && (
                          <p className="text-xs">{m.verificationStatus}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documents */}
            {Object.keys(documentCounts).length > 0 && (
              <div className="rounded-lg border border-line bg-panel p-5">
                <h2 className="mb-4 text-sm font-semibold">{t("documentsTitle")}</h2>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(documentCounts).map(([status, count]) => (
                    <div className="rounded-lg border border-line bg-background px-3 py-2 text-sm" key={status}>
                      <span className="font-semibold">{count}</span>{" "}
                      <span className="text-muted">{status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active merges */}
            <div className="rounded-lg border border-line bg-panel overflow-hidden">
              <div className="border-b border-line px-5 py-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{t("mergesTitle")}</h2>
                <Link className="text-xs font-semibold text-brand hover:text-brand-strong" href="/support/merges">
                  All merges →
                </Link>
              </div>
              {activeMerges.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted">{t("noMerges")}</p>
              ) : (
                <div className="divide-y divide-line">
                  {activeMerges.map((merge) => (
                    <div className="flex items-center justify-between gap-4 px-5 py-3 text-sm" key={merge.id}>
                      <div>
                        <p className="font-semibold">Merge #{merge.id}</p>
                        <p className="text-muted">
                          {merge.sourceUserId} → {merge.targetUserId}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-[#fff5e5] px-2 py-0.5 text-xs font-semibold text-[#8a520c]">
                          {merge.status}
                        </span>
                        <Link className="font-semibold text-brand hover:text-brand-strong" href={`/support/merges/${merge.id}`}>
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Potential duplicates */}
            {duplicates.length > 0 && (
              <div className="rounded-lg border border-line bg-panel overflow-hidden">
                <div className="border-b border-line px-5 py-4">
                  <h2 className="text-sm font-semibold">{t("duplicatesTitle")}</h2>
                </div>
                <div className="divide-y divide-line">
                  {duplicates.map((dup: AuthenticatedUser) => (
                    <div className="flex items-center justify-between gap-4 px-5 py-3 text-sm" key={dup.id}>
                      <div>
                        <p className="font-semibold">{dup.name}</p>
                        <p className="text-muted">{dup.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${statusBadge(dup.status)}`}>
                          {dup.status}
                        </span>
                        <Link className="font-semibold text-brand hover:text-brand-strong" href={`/support/users/${dup.id}`}>
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit events */}
            <div className="rounded-lg border border-line bg-panel overflow-hidden">
              <div className="border-b border-line px-5 py-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{t("auditTitle")}</h2>
                <Link
                  className="text-xs font-semibold text-brand hover:text-brand-strong"
                  href={`/audit-logs/timeline/App%5CModels%5CUser/${user.id}`}
                >
                  Full timeline →
                </Link>
              </div>
              {recentAuditEvents.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted">{t("noAuditEvents")}</p>
              ) : (
                <div className="divide-y divide-line">
                  {recentAuditEvents.map((evt) => (
                    <div className="flex items-start gap-3 px-5 py-3 text-sm" key={evt.id}>
                      <span
                        className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${statusSeverityDot(evt.severity ?? "info")}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{evt.action}</p>
                        {evt.reason && <p className="text-muted">{evt.reason}</p>}
                      </div>
                      <time className="flex-shrink-0 text-xs text-muted">
                        {formatDate(evt.createdAt)}
                      </time>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
