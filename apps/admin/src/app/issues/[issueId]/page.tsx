import type { IssueStatus } from "@compound/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getIssue } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import { assignIssueAction, postCommentAction, updateIssueStatusAction } from "../actions";

interface IssueDetailPageProps {
  params: Promise<{ issueId: string }>;
  searchParams?: Promise<{
    updated?: string;
    assigned?: string;
    commented?: string;
  }>;
}

const statusOptions: Array<{ label: string; value: IssueStatus }> = [
  { label: "New", value: "new" },
  { label: "Triaged", value: "triaged" },
  { label: "Assigned", value: "assigned" },
  { label: "In progress", value: "in_progress" },
  { label: "Waiting for resident", value: "waiting_for_resident" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
  { label: "Reopened", value: "reopened" },
];

function statusTone(status: string): string {
  if (status === "resolved" || status === "closed") return "bg-[#e6f3ef] text-brand";
  if (status === "waiting_for_resident") return "bg-[#fff3f2] text-danger";
  if (status === "in_progress" || status === "assigned") return "bg-[#eaf0ff] text-[#244a8f]";
  if (status === "reopened") return "bg-[#f3ead7] text-accent";
  return "bg-[#f3ead7] text-accent";
}

function formatEnum(value: string): string {
  return value.replaceAll("_", " ");
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function IssueDetailPage({ params, searchParams }: IssueDetailPageProps) {
  await requireAdminUser(getCurrentUser);
  const { issueId } = await params;
  const sp = searchParams ? await searchParams : {};
  const issue = await getIssue(issueId);

  if (!issue) {
    notFound();
  }

  const nonInternalComments = issue.comments?.filter((c) => !c.isInternal) ?? [];
  const internalComments = issue.comments?.filter((c) => c.isInternal) ?? [];
  const isClosed = issue.status === "closed" || issue.status === "resolved";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/issues">
              ← All issues
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{issue.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Reported by {issue.reporter?.name ?? "Unknown"} on {formatDate(issue.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        {sp.updated ? (
          <p className="mb-4 rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">
            Issue status updated.
          </p>
        ) : null}
        {sp.assigned ? (
          <p className="mb-4 rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">
            Issue assignment updated.
          </p>
        ) : null}
        {sp.commented ? (
          <p className="mb-4 rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">
            Comment posted.
          </p>
        ) : null}

        <div className="grid gap-6 md:grid-cols-3">
          {/* Left column: issue details */}
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-lg font-semibold">Description</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{issue.description}</p>
            </div>

            {/* Public comments */}
            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-lg font-semibold">Activity thread</h2>
              {nonInternalComments.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No public comments yet.</p>
              ) : (
                <div className="mt-3 divide-y divide-line">
                  {nonInternalComments.map((comment) => (
                    <div key={comment.id} className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{comment.user?.name ?? "System"}</span>
                        <span className="text-xs text-muted">{formatDate(comment.createdAt)}</span>
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
                    placeholder="Write a public reply…"
                    required
                  />
                  <div className="flex items-center gap-4">
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                      type="submit"
                    >
                      Post comment
                    </button>
                  </div>
                </form>
              ) : null}
            </div>

            {/* Internal notes (admin-only) */}
            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-lg font-semibold">Internal notes</h2>
              <p className="text-xs text-muted">Only visible to admins and staff — not shown to the resident.</p>
              {internalComments.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No internal notes yet.</p>
              ) : (
                <div className="mt-3 divide-y divide-line">
                  {internalComments.map((comment) => (
                    <div key={comment.id} className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{comment.user?.name ?? "System"}</span>
                        <span className="text-xs text-muted">{formatDate(comment.createdAt)}</span>
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
                    placeholder="Write an internal note…"
                    required
                  />
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand"
                    type="submit"
                  >
                    Add internal note
                  </button>
                </form>
              ) : null}
            </div>
          </div>

          {/* Right column: metadata & actions */}
          <div className="space-y-6">
            <div className="rounded-lg border border-line bg-panel p-5 space-y-4">
              <div>
                <span className="text-xs font-semibold text-muted">Status</span>
                <div className="mt-1">
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${statusTone(issue.status)}`}>
                    {formatEnum(issue.status)}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">Priority</span>
                <div className="mt-1 capitalize text-sm">{issue.priority}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">Category</span>
                <div className="mt-1 capitalize text-sm">{formatEnum(issue.category)}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">Reporter</span>
                <div className="mt-1 text-sm font-semibold">{issue.reporter?.name ?? "Unknown"}</div>
                <div className="text-xs text-muted">{issue.reporter?.email ?? ""}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">Assigned to</span>
                <div className="mt-1 text-sm font-semibold">{issue.assignee?.name ?? "Unassigned"}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted">Location</span>
                <div className="mt-1 text-sm">
                  {issue.unit ? `Unit ${issue.unit.unitNumber}` : issue.building?.name ?? "—"}
                </div>
              </div>
              {issue.resolvedAt ? (
                <div>
                  <span className="text-xs font-semibold text-muted">Resolved at</span>
                  <div className="mt-1 text-sm">{formatDate(issue.resolvedAt)}</div>
                </div>
              ) : null}
            </div>

            {/* Status transition */}
            {!isClosed ? (
              <div className="rounded-lg border border-line bg-panel p-5">
                <h3 className="text-sm font-semibold">Update status</h3>
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
                    Save status
                  </button>
                </form>
              </div>
            ) : null}

            {/* Reassign */}
            {!isClosed ? (
              <div className="rounded-lg border border-line bg-panel p-5">
                <h3 className="text-sm font-semibold">Reassign</h3>
                <form action={assignIssueAction.bind(null, issue.id)} className="mt-3 flex flex-col gap-3">
                  <input
                    className="h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                    defaultValue={issue.assignedTo ?? ""}
                    name="assignedTo"
                    placeholder="User ID (leave empty to unassign)"
                  />
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand"
                    type="submit"
                  >
                    Update assignment
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
