import type { IssueStatus } from "@compound/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { SiteNav } from "@/components/site-nav";
import { getCurrentUser, getIssue, getIssueAttachments } from "@/lib/api";
import { issueStatusBadgeClass } from "@/lib/semantic-badges";
import { requireAdminUser } from "@/lib/session";

import { assignIssueAction, escalateIssueAction, postCommentAction, updateIssueStatusAction } from "../actions";
import { AttachmentGallery } from "./attachment-gallery";

interface IssueDetailPageProps {
  params: Promise<{ issueId: string }>;
  searchParams?: Promise<{
    updated?: string;
    assigned?: string;
    commented?: string;
    escalated?: string;
  }>;
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function IssueDetailPage({ params, searchParams }: IssueDetailPageProps) {
  await requireAdminUser(getCurrentUser);
  const { issueId } = await params;
  const sp = searchParams ? await searchParams : {};

  const [issue, attachments, t, locale] = await Promise.all([
    getIssue(issueId),
    getIssueAttachments(issueId),
    getTranslations("Issues"),
    getLocale(),
  ]);

  if (!issue) {
    notFound();
  }

  const statusOptions: Array<{ label: string; value: IssueStatus }> = [
    { label: t("statusNew"), value: "new" },
    { label: t("statusInProgress"), value: "in_progress" },
    { label: t("statusEscalated"), value: "escalated" },
    { label: t("statusResolved"), value: "resolved" },
    { label: t("statusClosed"), value: "closed" },
  ];

  const statusLabel: Record<string, string> = {
    new: t("statusNew"),
    in_progress: t("statusInProgress"),
    escalated: t("statusEscalated"),
    resolved: t("statusResolved"),
    closed: t("statusClosed"),
  };

  const priorityLabel: Record<string, string> = {
    low: t("priorityLow"),
    normal: t("priorityNormal"),
    high: t("priorityHigh"),
    urgent: t("priorityUrgent"),
  };

  const categoryLabel: Record<string, string> = {
    maintenance: t("catMaintenance"),
    security: t("catSecurity"),
    cleaning: t("catCleaning"),
    noise: t("catNoise"),
    other: t("catOther"),
  };

  const nonInternalComments = issue.comments?.filter((c) => !c.isInternal) ?? [];
  const internalComments = issue.comments?.filter((c) => c.isInternal) ?? [];
  const isClosed = issue.status === "closed" || issue.status === "resolved";
  const isEscalated = issue.status === "escalated";

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[{ label: "Issues", href: "/issues" }, { label: issue.title }]} />
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/issues">
              ← {t("backToIssues")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{issue.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {t("reporter")}: {issue.reporter?.name ?? t("unknownReporter")} - {formatDate(issue.createdAt, locale)}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        {sp.updated ? (
          <p className="mb-4 rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">
            {t("updateStatus")}
          </p>
        ) : null}
        {sp.assigned ? (
          <p className="mb-4 rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">
            {t("reassign")}
          </p>
        ) : null}
        {sp.commented ? (
          <p className="mb-4 rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">
            {t("addComment")}
          </p>
        ) : null}

        <div className="grid gap-6 md:grid-cols-3">
          {/* Left column: issue details */}
          <div className="md:col-span-2 space-y-6">
            <AttachmentGallery attachments={attachments.map(a => {
              const absoluteUrl = a.url.startsWith("http") ? a.url : `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1"}${a.url}`;
              return {
                ...a,
                url: a.mimeType?.startsWith("image/") ? `/api/proxy/image?url=${encodeURIComponent(absoluteUrl)}` : absoluteUrl
              };
            })} />

            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-lg font-semibold">{t("description")}</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{issue.description}</p>
            </div>

            {/* Public comments */}
            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-lg font-semibold">{t("activity")}</h2>
              {nonInternalComments.length === 0 ? (
                <p className="mt-3 text-sm text-muted">{t("noIssues")}</p>
              ) : (
                <div className="mt-3 divide-y divide-line">
                  {nonInternalComments.map((comment) => (
                    <div key={comment.id} className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{comment.user?.name ?? t("systemUser")}</span>
                        <span className="text-xs text-muted">{formatDate(comment.createdAt, locale)}</span>
                      </div>
                      <p className="mt-1 text-sm leading-6 whitespace-pre-wrap">{comment.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {!isClosed ? (
                <form action={postCommentAction.bind(null, issue.id)} className="mt-4 space-y-3">
                  <textarea
                    className="h-24 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                    name="body"
                    placeholder={t("commentPlaceholder")}
                    required
                  />
                  <div className="flex items-center gap-4">
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                      type="submit"
                    >
                      {t("addComment")}
                    </button>
                  </div>
                </form>
              ) : null}
            </div>

            {/* Internal notes (admin-only) */}
            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-lg font-semibold">{t("internalNote")}</h2>
              <p className="text-xs text-muted">{t("internalNoteLabel")}</p>
              {internalComments.length === 0 ? (
                <p className="mt-3 text-sm text-muted">{t("noIssues")}</p>
              ) : (
                <div className="mt-3 divide-y divide-line">
                  {internalComments.map((comment) => (
                    <div key={comment.id} className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{comment.user?.name ?? t("systemUser")}</span>
                        <span className="text-xs text-muted">{formatDate(comment.createdAt, locale)}</span>
                      </div>
                      <p className="mt-1 text-sm leading-6 whitespace-pre-wrap">{comment.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {!isClosed ? (
                <form action={postCommentAction.bind(null, issue.id)} className="mt-4 space-y-3">
                  <input type="hidden" name="isInternal" value="1" />
                  <textarea
                    className="h-24 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                    name="body"
                    placeholder={t("commentPlaceholder")}
                    required
                  />
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand"
                    type="submit"
                  >
                    {t("internalNote")}
                  </button>
                </form>
              ) : null}
            </div>
          </div>

          {/* Right column: metadata & actions */}
          <div className="space-y-6">
            <div className="rounded-lg border border-line bg-panel p-5 space-y-4">
              <div>
                <span className="text-xs font-semibold text-muted">{t("status")}</span>
                <div className="mt-1">
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${issueStatusBadgeClass(issue.status)}`}>
                    {statusLabel[issue.status] ?? issue.status}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">{t("priority")}</span>
                <div className="mt-1 text-sm">{priorityLabel[issue.priority] ?? issue.priority}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">{t("category")}</span>
                <div className="mt-1 text-sm">{categoryLabel[issue.category] ?? issue.category}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">{t("reporter")}</span>
                <div className="mt-1 text-sm font-semibold">{issue.reporter?.name ?? t("unknownReporter")}</div>
                <div className="text-xs text-muted">{issue.reporter?.email ?? ""}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">{t("assignee")}</span>
                <div className="mt-1 text-sm font-semibold">{issue.assignee?.name ?? t("unassigned")}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">{t("location")}</span>
                <div className="mt-1 text-sm">
                  {issue.unit ? t("unitNumber", { unit: issue.unit.unitNumber }) : issue.building?.name ?? "—"}
                </div>
              </div>
              {issue.resolvedAt ? (
                <div>
                  <span className="text-xs font-semibold text-muted">{t("resolvedAt")}</span>
                  <div className="mt-1 text-sm">{formatDate(issue.resolvedAt, locale)}</div>
                </div>
              ) : null}
            </div>

            {/* Status transition */}
            {!isClosed ? (
              <div className="rounded-lg border border-line bg-panel p-5">
                <h3 className="text-sm font-semibold">{t("updateStatus")}</h3>
                <form action={updateIssueStatusAction.bind(null, issue.id)} className="mt-3 flex flex-col gap-3">
                  <select
                    className="h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                    defaultValue={issue.status}
                    name="status"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                    type="submit"
                  >
                    {t("save")}
                  </button>
                </form>
              </div>
            ) : null}

            {/* Reassign */}
            {!isClosed ? (
              <div className="rounded-lg border border-line bg-panel p-5">
                <h3 className="text-sm font-semibold">{t("reassign")}</h3>
                <form action={assignIssueAction.bind(null, issue.id)} className="mt-3 flex flex-col gap-3">
                  <input
                    className="h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                    defaultValue={issue.assignedTo ?? ""}
                    name="assignedTo"
                    placeholder={t("unassigned")}
                  />
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand"
                    type="submit"
                  >
                    {t("save")}
                  </button>
                </form>
              </div>
            ) : null}

            {/* Escalate */}
            {!isClosed && !isEscalated ? (
              <div className="rounded-lg border border-line bg-panel p-5">
                <h3 className="text-sm font-semibold">{t("escalate")}</h3>
                <form action={escalateIssueAction.bind(null, issue.id)} className="mt-3 flex flex-col gap-3">
                  <input
                    className="h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                    name="reason"
                    placeholder={t("escalateReason")}
                    required
                  />
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-danger px-4 text-sm font-semibold text-danger hover:bg-[#fff3f2]"
                    type="submit"
                  >
                    {t("escalate")}
                  </button>
                </form>
              </div>
            ) : null}

            {/* Attachments */}
            <div className="rounded-lg border border-line bg-panel p-5">
              <h3 className="text-sm font-semibold">{t("attachments")}</h3>
              {attachments.length === 0 ? (
                <p className="mt-3 text-sm text-muted">{t("noAttachments")}</p>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {attachments.map((att) => {
                    const absoluteUrl = att.url.startsWith("http") ? att.url : `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1"}${att.url}`;
                    const displayUrl = att.mimeType?.startsWith("image/") ? `/api/proxy/image?url=${encodeURIComponent(absoluteUrl)}` : absoluteUrl;
                    return (
                      <li key={att.id} className="flex items-center justify-between py-2">
                        <div>
                          <a 
                            href={displayUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-sm font-medium text-brand hover:underline"
                          >
                            {att.originalName}
                          </a>
                          <p className="text-xs text-muted">{formatFileSize(att.size)} · {formatDate(att.createdAt, locale)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
