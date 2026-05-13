import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SiteNav } from "@/components/site-nav";
import {
  getCurrentUser,
  getSecurityGates,
  getSecurityShifts,
  getSecurityDevices,
  getSecurityIncidents,
  getManualVisitorEntries,
} from "@/lib/api";
import { securityBadgeClass } from "@/lib/semantic-badges";
import { requireAdminUser } from "@/lib/session";

// ─── Small stat card ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function Badge({ status }: { status: string }) {
  const cls = securityBadgeClass(status);
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default async function SecurityPage() {
  await requireAdminUser(getCurrentUser, ["super_admin", "compound_admin"]);

  const [t, gates, shifts, devices, incidents, manualEntries] = await Promise.all([
    getTranslations("Security"),
    getSecurityGates(),
    getSecurityShifts(),
    getSecurityDevices(),
    getSecurityIncidents(),
    getManualVisitorEntries(),
  ]);

  const activeGates = gates.filter((g) => g.isActive).length;
  const activeShift = shifts.find((s) => s.status === "active");
  const activeDevices = devices.filter((d) => d.status === "active").length;
  const unresolvedIncidents = incidents.filter((i) => !i.resolvedAt).length;
  const recentEntries = manualEntries.slice(0, 5);

  const navSections = [
    { href: "/security/gates", key: "gates" },
    { href: "/security/shifts", key: "shifts" },
    { href: "/security/devices", key: "devices" },
    { href: "/security/incidents", key: "incidents" },
    { href: "/security/manual-entries", key: "manualEntries" },
    { href: "/security/admin", key: "adminAudit" },
    { href: "/security/admin-activity", key: "adminActivity" },
  ];

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
            {navSections.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="inline-flex h-10 items-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold transition hover:border-brand"
              >
                {t(`nav.${s.key}`)}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-6 px-5 py-6 lg:px-8">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label={t("stats.gates")} value={activeGates} sub={t("stats.activeOf", { total: gates.length })} />
          <StatCard
            label={t("stats.activeShift")}
            value={activeShift ? activeShift.name : t("stats.none")}
            sub={activeShift ? t("stats.shiftActive") : t("stats.noActiveShift")}
          />
          <StatCard label={t("stats.devices")} value={activeDevices} sub={t("stats.activeOf", { total: devices.length })} />
          <StatCard label={t("stats.unresolvedIncidents")} value={unresolvedIncidents} />
          <StatCard label={t("stats.manualEntries")} value={manualEntries.length} />
        </div>

        {/* Active shift detail */}
        {activeShift && (
          <div className="rounded-lg border border-line bg-panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("activeShift.title")}</h2>
              <Badge status="active" />
            </div>
            <p className="mt-1 font-medium">{activeShift.name}</p>
            <p className="mt-1 text-sm text-muted">
              {t("activeShift.startedAt")}: {activeShift.startedAt ?? "—"}
            </p>
            <div className="mt-4 flex gap-3">
              <Link
                href="/security/shifts"
                className="inline-flex h-9 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
              >
                {t("activeShift.viewAll")}
              </Link>
            </div>
          </div>
        )}

        {/* Recent incidents */}
        {incidents.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("recentIncidents.title")}</h2>
              <Link href="/security/incidents" className="text-sm font-semibold text-brand hover:text-brand-strong">
                {t("recentIncidents.viewAll")}
              </Link>
            </div>
            <div className="divide-y divide-line rounded-lg border border-line bg-panel">
              {incidents.slice(0, 5).map((inc) => (
                <div key={inc.id} className="flex items-center gap-3 px-4 py-3">
                  <Badge status={inc.type} />
                  <span className="flex-1 truncate text-sm font-medium">{inc.title}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {new Date(inc.occurredAt).toLocaleDateString()}
                  </span>
                  {inc.resolvedAt ? (
                    <span className="shrink-0 text-xs font-semibold text-brand">{t("recentIncidents.resolved")}</span>
                  ) : (
                    <span className="shrink-0 text-xs font-semibold text-danger">{t("recentIncidents.open")}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent manual entries */}
        {recentEntries.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("recentEntries.title")}</h2>
              <Link href="/security/manual-entries" className="text-sm font-semibold text-brand hover:text-brand-strong">
                {t("recentEntries.viewAll")}
              </Link>
            </div>
            <div className="divide-y divide-line rounded-lg border border-line bg-panel">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <Badge status={entry.status} />
                  <span className="flex-1 truncate text-sm font-medium">{entry.visitorName}</span>
                  <span className="shrink-0 text-xs text-muted">{entry.reason}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {new Date(entry.occurredAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
