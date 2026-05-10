import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getCompounds } from "@/lib/api";
import { hasEffectiveRole } from "@/lib/auth-access";
import { listAllRepresentativeAssignments } from "@/lib/orgchart-actions";
import { getCompoundContext, requireAdminUser } from "@/lib/session";

import {
  createRepresentativeAssignmentAction,
  deactivateRepresentativeAssignmentAction,
} from "./actions";

interface OrgChartPageProps {
  searchParams?: Promise<{
    created?: string;
    deactivated?: string;
  }>;
}

const REPRESENTATIVE_ROLES = [
  "floor_representative",
  "building_representative",
  "association_member",
  "president",
  "treasurer",
  "security_contact",
  "admin_contact",
] as const;

interface ScopeLabels {
  compound: string;
  building: (id: string) => string;
  floor: (id: string) => string;
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
}

function formatScope(assignment: {
  scopeLevel: string;
  buildingId: string | null;
  floorId: string | null;
}, labels: ScopeLabels): string {
  if (assignment.scopeLevel === "compound") return labels.compound;
  if (assignment.scopeLevel === "building" && assignment.buildingId) {
    return labels.building(assignment.buildingId.substring(0, 8));
  }
  if (assignment.scopeLevel === "floor" && assignment.floorId) {
    return labels.floor(assignment.floorId.substring(0, 8));
  }
  return assignment.scopeLevel;
}

export default async function OrgChartPage({ searchParams }: OrgChartPageProps) {
  const currentUser = await requireAdminUser(getCurrentUser);
  const locale = await getLocale();
  const t = await getTranslations("OrgChart");
  const params = searchParams ? await searchParams : {};
  const isSuperAdmin = hasEffectiveRole(currentUser, "super_admin");

  const [assignments, compounds, activeCompoundId] = await Promise.all([
    listAllRepresentativeAssignments(),
    getCompounds(),
    getCompoundContext(),
  ]);

  const defaultCompoundId = activeCompoundId ?? compounds[0]?.id ?? "";
  const activeCompound = compounds.find((compound) => compound.id === defaultCompoundId) ?? compounds[0] ?? null;
  const scopeLabels: ScopeLabels = {
    compound: t("scope.compound"),
    building: (id) => t("scope.building", { id }),
    floor: (id) => t("scope.floor", { id }),
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/">
              {t("nav.dashboard")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-8 px-5 py-6 lg:px-8">
        {params.created ? <StatusBanner text={t("messages.created")} /> : null}
        {params.deactivated ? <StatusBanner text={t("messages.deactivated")} /> : null}

        <div className="rounded-lg border border-line bg-panel px-4 py-3 text-sm">
          <span className="font-semibold text-muted">{t("scopeLabel")}</span>{" "}
          <span className="font-semibold text-foreground">
            {activeCompound ? activeCompound.name : isSuperAdmin ? t("scope.allCompounds") : t("scope.noCompound")}
          </span>
        </div>

        {/* Assignments table */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{t("title")}</h2>

          <div className="rounded-lg border border-line bg-panel">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] border-collapse text-sm">
                <thead className="bg-background text-muted">
                  <tr>
                    <th className="px-4 py-3 text-start font-semibold">{t("table.name")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("table.role")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("table.scope")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("table.status")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("table.term")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {assignments.length > 0 ? (
                    assignments.map((a) => (
                      <tr className="hover:bg-background/60" key={a.id}>
                        <td className="px-4 py-3 font-medium">{a.user?.name ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-lg bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                            {t(`roles.${a.role}`)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted">{formatScope(a, scopeLabels)}</td>
                        <td className="px-4 py-3">
                          {a.isActive ? (
                            <span className="rounded-lg bg-[#e6f3ef] px-2 py-0.5 text-xs font-semibold text-brand">
                              {t("status.active")}
                            </span>
                          ) : (
                            <span className="rounded-lg bg-background px-2 py-0.5 text-xs text-muted">
                              {t("status.inactive")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted">
                          {formatDate(a.startsAt, locale)}
                          {a.endsAt ? ` – ${formatDate(a.endsAt, locale)}` : ""}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Link
                              className="text-xs font-semibold text-brand hover:text-brand-strong"
                              href={`/representative-assignments/${a.id}/edit`}
                            >
                              {t("action.edit")}
                            </Link>
                            {a.isActive ? (
                              <form action={deactivateRepresentativeAssignmentAction.bind(null, a.id)}>
                                <button
                                  className="text-xs font-semibold text-danger hover:underline"
                                  type="submit"
                                >
                                  {t("action.deactivate")}
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-6 text-muted" colSpan={6}>
                        {t("empty")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create new assignment form */}
          <form
            action={createRepresentativeAssignmentAction}
            className="rounded-lg border border-line bg-panel p-5"
          >
            <h3 className="text-base font-semibold">{t("newAssignment")}</h3>
            <input name="compound_id" type="hidden" value={defaultCompoundId} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-semibold text-muted">
                {t("form.userId")}
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                  name="user_id"
                  placeholder={t("form.userIdPlaceholder")}
                  required
                  type="number"
                />
              </label>

              <label className="text-xs font-semibold text-muted">
                {t("form.role")}
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                  name="role"
                  required
                >
                  <option value="">{t("form.selectPlaceholder")}</option>
                  {REPRESENTATIVE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {t(`roles.${role}`)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold text-muted">
                {t("form.scopeId")}
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                  name="building_id"
                  placeholder={t("form.scopeIdPlaceholder")}
                />
              </label>

              <label className="text-xs font-semibold text-muted">
                {t("form.startDate")}
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                  name="starts_at"
                  required
                  type="date"
                />
              </label>

              <label className="text-xs font-semibold text-muted">
                {t("form.endDate")}
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                  name="ends_at"
                  type="date"
                />
              </label>

              <label className="text-xs font-semibold text-muted">
                {t("form.notes")}
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                  name="notes"
                  placeholder={t("form.notesPlaceholder")}
                />
              </label>
            </div>
            <button
              className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
              type="submit"
            >
              {t("form.submit")}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}

function StatusBanner({ text }: { text: string }) {
  return <p className="rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">{text}</p>;
}
