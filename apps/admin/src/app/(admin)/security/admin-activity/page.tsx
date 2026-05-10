import Link from "next/link";

import { SiteNav } from "@/components/site-nav";
import { getAdminSecurityFlags, getCurrentUser } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-danger/10 text-danger border-danger/20",
  warning: "bg-[#fff8e8] text-[#7a5d1a] border-[#e7d7a9]",
  info: "bg-brand/10 text-brand border-brand/20",
};

const FLAG_TYPE_LABELS: Record<string, string> = {
  new_device: "New Device",
  new_ip: "New IP Address",
  too_many_ips: "Too Many IPs (24h)",
  high_risk_action: "High-Risk Action",
  failed_login_spike: "Failed Login Spike",
};

export default async function AdminActivityPage() {
  await requireAdminUser(getCurrentUser);
  const flags = await getAdminSecurityFlags();

  const open = flags.filter((f) => f.status === "open");
  const reviewed = flags.filter((f) => f.status !== "open");

  return (
    <>
      <SiteNav
        breadcrumb={[
          { label: "Security", href: "/security" },
          { label: "Admin Activity" },
        ]}
      />
      <main className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Admin Activity</h1>
            <p className="mt-1 text-sm text-muted">
              Monitor admin sessions, IP addresses, devices, and suspicious activity flags.
            </p>
          </div>
          <Link
            href="/support/users"
            className="inline-flex h-10 items-center rounded-xl border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
          >
            View Admins
          </Link>
        </div>

        {/* Open flags */}
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-lg font-semibold">Open Flags</h2>
            {open.length > 0 && (
              <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-bold text-danger">
                {open.length}
              </span>
            )}
          </div>

          {open.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-panel px-6 py-8 text-center">
              <p className="text-sm font-medium text-foreground">No open flags</p>
              <p className="mt-1 text-sm text-muted">All suspicious activity has been reviewed.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {open.map((flag) => (
                <li key={flag.id} className={`rounded-xl border p-5 ${SEVERITY_STYLES[flag.severity] ?? SEVERITY_STYLES.info}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                          {FLAG_TYPE_LABELS[flag.type] ?? flag.type}
                        </span>
                        <span className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider opacity-80">
                          {flag.severity}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-medium">{flag.summary}</p>
                      {flag.user && (
                        <p className="mt-1 text-xs opacity-70">
                          Admin: {flag.user.name} ({flag.user.email})
                        </p>
                      )}
                      {flag.createdAt && (
                        <p className="mt-0.5 text-xs opacity-60">
                          {new Date(flag.createdAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {flag.user && (
                      <div className="flex shrink-0 gap-2">
                        <Link
                          href={`/support/users/${flag.user.id}`}
                          className="inline-flex h-9 items-center rounded-lg border border-current/20 bg-white/30 px-3 text-xs font-semibold hover:bg-white/50"
                        >
                          View Admin
                        </Link>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Reviewed / dismissed */}
        {reviewed.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-muted">Reviewed &amp; Dismissed</h2>
            <ul className="space-y-2">
              {reviewed.map((flag) => (
                <li
                  key={flag.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-line bg-panel/60 px-4 py-3 opacity-70"
                >
                  <div>
                    <span className="text-xs font-semibold text-muted">
                      {FLAG_TYPE_LABELS[flag.type] ?? flag.type}
                    </span>
                    <p className="text-sm text-foreground">{flag.summary}</p>
                    {flag.user && (
                      <p className="text-xs text-muted">{flag.user.name}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      flag.status === "reviewed"
                        ? "bg-brand/10 text-brand"
                        : "bg-muted/10 text-muted"
                    }`}
                  >
                    {flag.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
