import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getManualVisitorEntries, getSecurityGates } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

function statusTone(status: string): string {
  return status === "allowed" ? "bg-[#e6f3ef] text-brand" : "bg-[#fff3f2] text-danger";
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

interface SearchParams {
  status?: string;
  gateId?: string;
  from?: string;
  to?: string;
}

export default async function ManualEntriesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  await requireAdminUser(getCurrentUser, ["super_admin", "compound_admin", "support_agent"]);

  const params = searchParams ? await searchParams : {};
  const status = params.status && ["allowed", "denied"].includes(params.status) ? params.status : undefined;

  const [t, entries, gates] = await Promise.all([
    getTranslations("Security"),
    getManualVisitorEntries({
      status,
      gateId: params.gateId,
      from: params.from,
      to: params.to,
    }),
    getSecurityGates(),
  ]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/security">
              {t("back")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("manualEntries.title")}</h1>
            <p className="mt-1 text-sm text-muted">{t("manualEntries.subtitle")}</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-5 px-5 py-6 lg:px-8">
        {/* Filters */}
        <form className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-panel p-4">
          <label className="text-sm font-semibold">
            {t("manualEntries.filterStatus")}
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="mt-2 block h-11 rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
            >
              <option value="">{t("manualEntries.allStatuses")}</option>
              <option value="allowed">{t("manualEntries.statusAllowed")}</option>
              <option value="denied">{t("manualEntries.statusDenied")}</option>
            </select>
          </label>

          {gates.length > 0 && (
            <label className="text-sm font-semibold">
              {t("manualEntries.filterGate")}
              <select
                name="gateId"
                defaultValue={params.gateId ?? ""}
                className="mt-2 block h-11 rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
              >
                <option value="">{t("incidents.allGates")}</option>
                {gates.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="text-sm font-semibold">
            {t("filterFrom")}
            <input
              name="from"
              type="date"
              defaultValue={params.from ?? ""}
              className="mt-2 block h-11 rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
            />
          </label>
          <label className="text-sm font-semibold">
            {t("filterTo")}
            <input
              name="to"
              type="date"
              defaultValue={params.to ?? ""}
              className="mt-2 block h-11 rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
            >
              {t("filterApply")}
            </button>
            <Link
              href="/security/manual-entries"
              className="inline-flex h-11 items-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
            >
              {t("filterClear")}
            </Link>
          </div>
        </form>

        {entries.length === 0 ? (
          <div className="rounded-lg border border-line bg-panel px-6 py-12 text-center text-sm text-muted">
            {t("manualEntries.empty")}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-line bg-panel">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-background text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 text-start">{t("manualEntries.cols.visitor")}</th>
                  <th className="px-4 py-3 text-start">{t("manualEntries.cols.reason")}</th>
                  <th className="px-4 py-3 text-start">{t("manualEntries.cols.host")}</th>
                  <th className="px-4 py-3 text-start">{t("manualEntries.cols.gate")}</th>
                  <th className="px-4 py-3 text-start">{t("manualEntries.cols.status")}</th>
                  <th className="px-4 py-3 text-start">{t("manualEntries.cols.time")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-background">
                    <td className="px-4 py-3">
                      <p className="font-medium">{entry.visitorName}</p>
                      {entry.visitorPhone && <p className="text-xs text-muted">{entry.visitorPhone}</p>}
                      {entry.vehiclePlate && <p className="text-xs text-muted">{entry.vehiclePlate}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted">{entry.reason}</td>
                    <td className="px-4 py-3 text-muted">
                      {entry.host?.name ?? "—"}
                      {entry.hostUnit && <span className="block text-xs">Unit {entry.hostUnit.unitNumber}</span>}
                    </td>
                    <td className="px-4 py-3 text-muted">{entry.gate?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${statusTone(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{formatDateTime(entry.occurredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
