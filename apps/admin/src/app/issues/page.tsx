import type { IssueCategory, IssueStatus } from "@compound/contracts";
import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getIssues } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

interface IssuesPageProps {
  searchParams?: Promise<{
    status?: string;
    category?: string;
  }>;
}

const statusFilters: Array<{ label: string; value: IssueStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Triaged", value: "triaged" },
  { label: "Assigned", value: "assigned" },
  { label: "In progress", value: "in_progress" },
  { label: "Waiting", value: "waiting_for_resident" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
  { label: "Reopened", value: "reopened" },
];

const categoryFilters: Array<{ label: string; value: IssueCategory | "all" }> = [
  { label: "All", value: "all" },
  { label: "Maintenance", value: "maintenance" },
  { label: "Security", value: "security" },
  { label: "Cleaning", value: "cleaning" },
  { label: "Noise", value: "noise" },
  { label: "Other", value: "other" },
];

function parseStatus(value?: string): IssueStatus | "all" {
  return statusFilters.some((f) => f.value === value) ? (value as IssueStatus | "all") : "all";
}

function parseCategory(value?: string): IssueCategory | "all" {
  return categoryFilters.some((f) => f.value === value) ? (value as IssueCategory | "all") : "all";
}

function statusTone(status: string): string {
  if (status === "resolved" || status === "closed") return "bg-[#e6f3ef] text-brand";
  if (status === "waiting_for_resident") return "bg-[#fff3f2] text-danger";
  if (status === "in_progress" || status === "assigned") return "bg-[#eaf0ff] text-[#244a8f]";
  if (status === "reopened") return "bg-[#f3ead7] text-accent";
  return "bg-[#f3ead7] text-accent";
}

function priorityTone(priority: string): string {
  if (priority === "urgent") return "bg-[#fff3f2] text-danger";
  if (priority === "high") return "bg-[#f3ead7] text-accent";
  return "bg-background text-muted";
}

function formatEnum(value: string): string {
  return value.replaceAll("_", " ");
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function IssuesPage({ searchParams }: IssuesPageProps) {
  await requireAdminUser(getCurrentUser);
  const params = searchParams ? await searchParams : {};
  const activeStatus = parseStatus(params.status);
  const activeCategory = parseCategory(params.category);

  const issues = await getIssues({ status: activeStatus, category: activeCategory });

  const issuesHref = (nextStatus: IssueStatus | "all", nextCategory: IssueCategory | "all") => {
    const hrefParams = new URLSearchParams();
    if (nextStatus !== "all") hrefParams.set("status", nextStatus);
    if (nextCategory !== "all") hrefParams.set("category", nextCategory);
    const qs = hrefParams.toString();
    return `/issues${qs ? `?${qs}` : ""}`;
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/">
              Dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">Issue management</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Review resident complaints, track issue resolution, and manage escalations across all compounds.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
              href="/compounds"
            >
              Property registry
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Status</h2>
            <nav className="mt-3 flex flex-wrap gap-2" aria-label="Issue status filters">
              {statusFilters.map((f) => (
                <Link
                  className={`inline-flex h-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold ${
                    activeStatus === f.value
                      ? "border-brand bg-[#e6f3ef] text-brand"
                      : "border-line bg-panel text-foreground hover:border-brand"
                  }`}
                  href={issuesHref(f.value, activeCategory)}
                  key={f.value}
                >
                  {f.label}
                </Link>
              ))}
            </nav>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Category</h2>
            <nav className="mt-3 flex flex-wrap gap-2" aria-label="Issue category filters">
              {categoryFilters.map((f) => (
                <Link
                  className={`inline-flex h-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold ${
                    activeCategory === f.value
                      ? "border-brand bg-[#e6f3ef] text-brand"
                      : "border-line bg-panel text-foreground hover:border-brand"
                  }`}
                  href={issuesHref(activeStatus, f.value)}
                  key={f.value}
                >
                  {f.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-line bg-panel">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Reporter</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Assigned to</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {issues.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted" colSpan={9}>
                    No issues match the current filters.
                  </td>
                </tr>
              ) : (
                issues.map((issue) => (
                  <tr key={issue.id}>
                    <td className="px-4 py-4 font-mono text-xs">{issue.id.slice(0, 8)}</td>
                    <td className="px-4 py-4">
                      <Link className="font-semibold text-brand hover:text-brand-strong" href={`/issues/${issue.id}`}>
                        {issue.title}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold">{issue.reporter?.name ?? "Unknown"}</div>
                      <div className="text-muted">{issue.reporter?.email ?? ""}</div>
                    </td>
                    <td className="px-4 py-4 capitalize">{formatEnum(issue.category)}</td>
                    <td className="px-4 py-4">
                      {issue.unit ? (
                        <span>Unit {issue.unit.unitNumber}</span>
                      ) : issue.building ? (
                        <span>{issue.building.name}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">{issue.assignee?.name ?? <span className="text-muted">Unassigned</span>}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${statusTone(issue.status)}`}>
                        {formatEnum(issue.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${priorityTone(issue.priority)}`}>
                        {issue.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted">{formatDate(issue.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
