import type { AuditLogEntry } from "@compound/contracts";
import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { getAuditLogs, getCurrentUser } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

interface AuditLogsPageProps {
  searchParams?: Promise<{
    action?: string;
    actorId?: string;
    from?: string;
    method?: string;
    q?: string;
    to?: string;
  }>;
}

const methodOptions = ["", "GET", "POST", "PATCH", "PUT", "DELETE"];

function formatDate(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

function metadataSummary(entry: AuditLogEntry): string {
  const keys = Object.keys(entry.metadata);

  if (keys.length === 0) {
    return "No metadata";
  }

  return keys.slice(0, 4).join(", ");
}

function statusTone(statusCode: number | null): string {
  if (!statusCode) {
    return "bg-background text-muted";
  }

  if (statusCode >= 500) {
    return "bg-[#fde8e5] text-danger";
  }

  if (statusCode >= 400) {
    return "bg-[#fff5e5] text-[#8a520c]";
  }

  return "bg-[#e6f3ef] text-brand";
}

export default async function AuditLogsPage({ searchParams }: AuditLogsPageProps) {
  await requireAdminUser(getCurrentUser, ["super_admin", "compound_admin", "support_agent"]);
  const params = searchParams ? await searchParams : {};
  const actorId = params.actorId && Number.isInteger(Number(params.actorId)) ? Number(params.actorId) : undefined;
  const auditLogs = await getAuditLogs({
    action: params.action?.trim() || undefined,
    actorId,
    from: params.from || undefined,
    method: params.method || undefined,
    perPage: 50,
    q: params.q?.trim() || undefined,
    to: params.to || undefined,
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/">
              Dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">Audit logs</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Review sensitive API activity by actor, action, request path, status, and timestamp.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
              href="/onboarding"
            >
              Onboarding
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        <form className="grid gap-3 rounded-lg border border-line bg-panel p-4 md:grid-cols-[1.2fr_1fr_0.7fr_0.7fr_0.7fr_auto]">
          <label className="text-sm font-semibold">
            Search
            <input
              className="mt-2 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
              defaultValue={params.q ?? ""}
              name="q"
              placeholder="Action, path, subject, IP"
            />
          </label>
          <label className="text-sm font-semibold">
            Action
            <input
              className="mt-2 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
              defaultValue={params.action ?? ""}
              name="action"
              placeholder="documents.user_document_reviewed"
            />
          </label>
          <label className="text-sm font-semibold">
            Actor ID
            <input
              className="mt-2 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
              defaultValue={params.actorId ?? ""}
              min={1}
              name="actorId"
              type="number"
            />
          </label>
          <label className="text-sm font-semibold">
            Method
            <select
              className="mt-2 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
              defaultValue={params.method ?? ""}
              name="method"
            >
              {methodOptions.map((method) => (
                <option key={method || "all"} value={method}>
                  {method || "All"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            From
            <input
              className="mt-2 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
              defaultValue={params.from ?? ""}
              name="from"
              type="date"
            />
          </label>
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1 text-sm font-semibold">
              To
              <input
                className="mt-2 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
                defaultValue={params.to ?? ""}
                name="to"
                type="date"
              />
            </label>
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
              type="submit"
            >
              Filter
            </button>
          </div>
        </form>

        <div className="mt-5 overflow-hidden rounded-lg border border-line bg-panel">
          <div className="flex flex-col gap-2 border-b border-line p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Recent activity</h2>
              <p className="mt-1 text-sm text-muted">Showing the latest {auditLogs.length} matching audit records.</p>
            </div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/audit-logs">
              Clear filters
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="bg-background text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Time</th>
                  <th className="px-4 py-3 font-semibold">Actor</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Request</th>
                  <th className="px-4 py-3 font-semibold">Subject</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted" colSpan={7}>
                      No audit records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-4 align-top text-muted">{formatDate(entry.createdAt)}</td>
                      <td className="px-4 py-4 align-top">
                        <div className="font-semibold">{entry.actor?.name ?? "System"}</div>
                        <div className="text-muted">{entry.actorId ? `User ${entry.actorId}` : "No actor"}</div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <code className="rounded-lg bg-background px-2 py-1 text-xs font-semibold">{entry.action}</code>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="font-semibold">{entry.method ?? "N/A"}</div>
                        <div className="max-w-xs truncate text-muted">{entry.path ?? "No path"}</div>
                        <div className="text-muted">{entry.ipAddress ?? "No IP"}</div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="max-w-xs truncate">{entry.auditableType ?? "No subject"}</div>
                        <div className="text-muted">{entry.auditableId ?? ""}</div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusTone(entry.statusCode)}`}>
                          {entry.statusCode ?? "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top text-muted">{metadataSummary(entry)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
