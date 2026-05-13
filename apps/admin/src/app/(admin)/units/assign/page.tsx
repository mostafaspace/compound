import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SiteNav } from "@/components/site-nav";
import { getBuilding, getCompound, getCurrentUser, getUnassignedUsers } from "@/lib/api";
import { getCompoundContext, requireAdminUser } from "@/lib/session";

import { assignUserToUnitAction } from "./actions";

interface AssignUnitPageProps {
  searchParams?: Promise<{ assigned?: string; error?: string }>;
}

export default async function AssignUnitPage({ searchParams }: AssignUnitPageProps) {
  const user = await requireAdminUser(getCurrentUser);
  const activeCompoundId = user.compoundId ?? (await getCompoundContext());
  const t = await getTranslations("Registry");
  const sp = searchParams ? await searchParams : {};
  const breadcrumb = [{ label: t("propertyRegistry"), href: "/compounds" }, { label: t("assignApartment.title") }];

  if (!activeCompoundId) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <SiteNav breadcrumb={breadcrumb} />

        <header className="border-b border-line bg-panel">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase text-brand">{t("assignApartment.eyebrow")}</p>
              <h1 className="mt-2 text-3xl font-semibold">{t("assignApartment.title")}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted">{t("assignApartment.noCompound.description")}</p>
            </div>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
              href="/"
            >
              {t("assignApartment.backToDashboard")}
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-4xl px-5 py-8 lg:px-8">
          <div className="rounded-xl border border-[#e7d7a9] bg-[#fff8e8] p-6">
            <h2 className="text-lg font-semibold text-[#7a5d1a]">{t("assignApartment.noCompound.title")}</h2>
            <p className="mt-2 text-sm text-[#7a5d1a]">{t("assignApartment.noCompound.helper")}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                href="/compounds"
              >
                {t("assignApartment.noCompound.openRegistry")}
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
                href="/"
              >
                {t("assignApartment.noCompound.returnToDashboard")}
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const [compound, unassignedUsers] = await Promise.all([
    getCompound(activeCompoundId),
    getUnassignedUsers(),
  ]);

  if (!compound) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <SiteNav breadcrumb={breadcrumb} />

        <header className="border-b border-line bg-panel">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase text-brand">{t("assignApartment.eyebrow")}</p>
              <h1 className="mt-2 text-3xl font-semibold">{t("assignApartment.title")}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted">{t("assignApartment.compoundUnavailable.description")}</p>
            </div>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
              href="/"
            >
              {t("assignApartment.backToDashboard")}
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-4xl px-5 py-8 lg:px-8">
          <div className="rounded-xl border border-[#f1c7c2] bg-[#fff3f2] p-6">
            <h2 className="text-lg font-semibold text-danger">{t("assignApartment.compoundUnavailable.title")}</h2>
            <p className="mt-2 text-sm text-danger">{t("assignApartment.compoundUnavailable.helper")}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                href="/compounds"
              >
                {t("assignApartment.compoundUnavailable.reopenRegistry")}
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
                href="/"
              >
                {t("assignApartment.compoundUnavailable.returnToDashboard")}
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const buildingDetails = (await Promise.all(
    (compound.buildings ?? []).map((building) => getBuilding(building.id)),
  )).filter((building): building is NonNullable<typeof building> => Boolean(building));

  const units = buildingDetails.flatMap((building) =>
    (building.units ?? []).map((unit) => ({
      ...unit,
      buildingName: building.name,
    })),
  );
  const hasUnits = units.length > 0;
  const hasUnassignedUsers = unassignedUsers.length > 0;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={breadcrumb} />

      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase text-brand">{t("assignApartment.eyebrow")}</p>
            <h1 className="mt-2 text-3xl font-semibold">{t("assignApartment.title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{t("assignApartment.description")}</p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
            href="/"
          >
            {t("assignApartment.backToDashboard")}
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        {sp.assigned ? (
          <p className="mb-5 rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">
            {t("assignApartment.messages.assigned")}
          </p>
        ) : null}
        {sp.error ? (
          <p className="mb-5 rounded-lg bg-[#fff3f2] px-4 py-3 text-sm font-medium text-danger">
            {t("assignApartment.messages.error")}
          </p>
        ) : null}
        {!hasUnits ? (
          <div className="mb-5 rounded-lg border border-[#e7d7a9] bg-[#fff8e8] px-4 py-3 text-sm text-[#7a5d1a]">
            {t("assignApartment.messages.noUnits", { compound: compound.name })}
            <Link className="ms-2 font-semibold text-brand hover:text-brand-strong" href="/compounds">
              {t("assignApartment.messages.reviewCompoundSetup")}
            </Link>
          </div>
        ) : null}

        <div className="mb-5 grid gap-4 md:grid-cols-3">
          <article className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("assignApartment.metrics.assignmentQueue.title")}</p>
            <p className="mt-2 text-2xl font-semibold">{unassignedUsers.length}</p>
            <p className="mt-1 text-sm text-muted">{t("assignApartment.metrics.assignmentQueue.description")}</p>
          </article>
          <article className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("assignApartment.metrics.availableUnits.title")}</p>
            <p className="mt-2 text-2xl font-semibold">{units.length}</p>
            <p className="mt-1 text-sm text-muted">{t("assignApartment.metrics.availableUnits.description", { compound: compound.name })}</p>
          </article>
          <article className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("assignApartment.metrics.operatorNote.title")}</p>
            <p className="mt-2 text-sm font-medium text-foreground">{t("assignApartment.metrics.operatorNote.lead")}</p>
            <p className="mt-1 text-sm text-muted">{t("assignApartment.metrics.operatorNote.description")}</p>
          </article>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-lg border border-line bg-panel">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-lg font-semibold">{t("assignApartment.unassignedUsers.title", { count: unassignedUsers.length })}</h2>
              <p className="mt-1 text-sm text-muted">{t("assignApartment.unassignedUsers.description")}</p>
            </div>
            {!hasUnassignedUsers ? (
              <div className="px-4 py-8">
                <p className="text-sm font-medium text-foreground">{t("assignApartment.unassignedUsers.empty.title")}</p>
                <p className="mt-2 text-sm text-muted">{t("assignApartment.unassignedUsers.empty.description")}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                    href="/"
                  >
                    {t("assignApartment.unassignedUsers.empty.returnToDashboard")}
                  </Link>
                  <Link
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
                    href="/compounds"
                  >
                    {t("assignApartment.unassignedUsers.empty.reviewCompoundRegistry")}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {unassignedUsers.map((unassignedUser) => (
                  <details key={unassignedUser.id} className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4">
                      <div>
                        <div className="font-semibold">{unassignedUser.name}</div>
                        <div className="text-sm text-muted">{unassignedUser.email}</div>
                        <div className="text-xs text-muted">{unassignedUser.phone ?? t("assignApartment.unassignedUsers.noPhone")}</div>
                      </div>
                      <span className="rounded-lg border border-line px-2 py-1 text-xs font-semibold text-muted group-open:border-brand group-open:text-brand">
                        {t("assignApartment.unassignedUsers.assign")}
                      </span>
                    </summary>
                    <div className="border-t border-line bg-background/40 px-4 py-4">
                      {hasUnits ? (
                        <form action={assignUserToUnitAction} className="grid gap-3">
                          <input type="hidden" name="userId" value={unassignedUser.id} />
                          <label className="text-sm font-medium">
                            {t("assignApartment.unassignedUsers.unitLabel")}
                            <select
                              className="mt-2 h-11 w-full rounded-lg border border-line bg-panel px-3"
                              defaultValue=""
                              name="unitId"
                              required
                            >
                              <option value="" disabled>{t("assignApartment.unassignedUsers.selectUnit")}</option>
                              {units.map((unit) => (
                                <option key={unit.id} value={unit.id}>
                                  {t("assignApartment.unassignedUsers.unitOption", {
                                    building: unit.buildingName,
                                    unit: unit.unitNumber,
                                  })}
                                </option>
                              ))}
                            </select>
                          </label>
                          <p className="text-xs text-muted">{t("assignApartment.unassignedUsers.assignmentHint")}</p>
                          <button
                            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                            type="submit"
                          >
                            {t("assignApartment.unassignedUsers.assignButton")}
                          </button>
                        </form>
                      ) : (
                        <div className="rounded-lg border border-dashed border-line bg-panel px-4 py-4 text-sm text-muted">
                          {t("assignApartment.unassignedUsers.unitSetupRequired")}
                          <Link className="ms-2 font-semibold text-brand hover:text-brand-strong" href="/compounds">
                            {t("assignApartment.unassignedUsers.openRegistry")}
                          </Link>
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-line bg-panel">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-lg font-semibold">{t("assignApartment.availableUnits.title", { count: units.length })}</h2>
              <p className="mt-1 text-sm text-muted">{t("assignApartment.availableUnits.description", { compound: compound.name })}</p>
            </div>
            {!hasUnits ? (
              <div className="px-4 py-8">
                <p className="text-sm font-medium text-foreground">{t("assignApartment.availableUnits.empty.title")}</p>
                <p className="mt-2 text-sm text-muted">{t("assignApartment.availableUnits.empty.description")}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
                    href="/compounds"
                  >
                    {t("assignApartment.availableUnits.empty.reviewCompoundRegistry")}
                  </Link>
                  <Link
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
                    href="/"
                  >
                    {t("assignApartment.availableUnits.empty.returnToDashboard")}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-start text-sm">
                  <thead className="bg-background text-muted">
                    <tr>
                      <th className="px-4 py-3 font-semibold">{t("assignApartment.availableUnits.table.building")}</th>
                      <th className="px-4 py-3 font-semibold">{t("assignApartment.availableUnits.table.unit")}</th>
                      <th className="px-4 py-3 font-semibold">{t("assignApartment.availableUnits.table.status")}</th>
                      <th className="px-4 py-3 font-semibold">{t("assignApartment.availableUnits.table.residents")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {units.map((unit) => (
                      <tr key={unit.id}>
                        <td className="px-4 py-4">{unit.buildingName}</td>
                        <td className="px-4 py-4">
                          <Link className="font-semibold text-brand hover:text-brand-strong" href={`/units/${unit.id}`}>
                            {unit.unitNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-4 capitalize">{unit.status}</td>
                        <td className="px-4 py-4">{unit.memberships?.length ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
