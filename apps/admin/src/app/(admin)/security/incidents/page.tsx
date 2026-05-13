import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { getCurrentUser, getSecurityGates, getSecurityIncidents } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";
import type { SecurityIncidentType } from "@compound/contracts";

const INCIDENT_TYPES: Array<SecurityIncidentType | "all"> = [
  "all",
  "denied_entry",
  "suspicious_activity",
  "emergency",
  "vehicle_issue",
  "operational_handover",
  "other",
];

function typeTone(type: string): string {
  const map: Record<string, string> = {
    emergency: "bg-[#fff3f2] text-danger",
    denied_entry: "bg-[#fff3f2] text-danger",
    suspicious_activity: "bg-[#f3ead7] text-[#8a520c]",
    operational_handover: "bg-[#eaf0ff] text-[#244a8f]",
    vehicle_issue: "bg-[#f3ead7] text-[#8a520c]",
    other: "bg-background text-muted",
  };
  return map[type] ?? "bg-background text-muted";
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

interface SearchParams {
  type?: string;
  gateId?: string;
  from?: string;
  to?: string;
}

export default async function SecurityIncidentsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  await requireAdminUser(getCurrentUser, ["super_admin", "compound_admin"]);

  const params = searchParams ? await searchParams : {};
  const activeType = INCIDENT_TYPES.includes(params.type as SecurityIncidentType | "all")
    ? (params.type as SecurityIncidentType | "all")
    : "all";

  const [t, incidents, gates] = await Promise.all([
    getTranslations("Security"),
    getSecurityIncidents({
      type: activeType !== "all" ? activeType : undefined,
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
            <h1 className="mt-2 text-3xl font-semibold">{t("incidents.title")}</h1>
            <p className="mt-1 text-sm text-muted">{t("incidents.subtitle")}</p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-5 px-5 py-6 lg:px-8">
        {/* Filters */}
        <form className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-panel p-4">
          <label className="text-sm font-semibold">
            {t("incidents.filterType")}
            <select
              name="type"
              defaultValue={activeType}
              className="mt-2 block h-11 rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
            >
              {INCIDENT_TYPES.map((typ) => (
                <option key={typ} value={typ}>
                  {t(`incidents.types.${typ}`)}
                </option>
              ))}
            </select>
          </label>

          {gates.length > 0 && (
            <label className="text-sm font-semibold">
              {t("incidents.filterGate")}
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
              href="/security/incidents"
              className="inline-flex h-11 items-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
            >
              {t("filterClear")}
            </Link>
          </div>
        </form>

        {incidents.length === 0 ? (
          <div className="rounded-lg border border-line bg-panel px-6 py-12 text-center text-sm text-muted">
            {t("incidents.empty")}
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className={`rounded-lg border bg-panel p-4 ${
                  !inc.resolvedAt ? "border-line" : "border-line opacity-75"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${typeTone(inc.type)}`}>
                      {inc.type.replace(/_/g, " ")}
                    </span>
                    <div>
                      <p className="font-semibold">{inc.title}</p>
                      <p className="mt-1 text-sm text-muted line-clamp-2">{inc.description}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-end text-xs text-muted">
                    <p>{formatDateTime(inc.occurredAt)}</p>
                    {inc.gate && <p className="mt-0.5">{inc.gate.name}</p>}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted">
                  <span>{t("incidents.reporter")}: {inc.reporter?.name ?? "—"}</span>
                  {inc.shift && <span>{t("incidents.shift")}: {inc.shift.name}</span>}
                  {inc.resolvedAt ? (
                    <span className="font-semibold text-brand">{t("incidents.resolved")}: {formatDateTime(inc.resolvedAt)}</span>
                  ) : (
                    <span className="font-semibold text-danger">{t("incidents.unresolved")}</span>
                  )}
                </div>
                {inc.notes && (
                  <p className="mt-2 rounded-lg bg-background px-3 py-2 text-xs text-muted">{inc.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
