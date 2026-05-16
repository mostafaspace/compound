import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SiteNav } from "@/components/site-nav";
import { getBuilding, getCompound, getCurrentUser, getUnassignedUsers } from "@/lib/api";
import { getCompoundContext, requireAdminUser } from "@/lib/session";

import { AssignmentWorkspace } from "./assignment-workspace";
import { assignUserToUnitAction } from "./actions";

interface AssignUnitPageProps {
  searchParams?: Promise<{ assigned?: string; error?: string }>;
}

export default async function AssignUnitPage({ searchParams }: AssignUnitPageProps) {
  const user = await requireAdminUser(getCurrentUser);
  const activeCompoundId = user.compoundId ?? (await getCompoundContext());
  const t = await getTranslations("Registry");
  const commonT = await getTranslations("Common");
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
  const paginationSummaryTemplate = commonT("pagination.summary", {
    from: "__FROM__",
    to: "__TO__",
    total: "__TOTAL__",
  });
  const unitOptionTemplate = t("assignApartment.unassignedUsers.unitOption", {
    building: "__BUILDING__",
    unit: "__UNIT__",
  });

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

      <section className="mx-auto max-w-6xl px-5 py-6 lg:px-8">
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

        <AssignmentWorkspace
          assignAction={assignUserToUnitAction}
          hasUnits={hasUnits}
          labels={{
            assignButton: t("assignApartment.unassignedUsers.assignButton"),
            assignmentColumn: t("assignApartment.unassignedUsers.table.assignment"),
            assignmentCountLabel: t("assignApartment.metrics.assignmentQueue.title"),
            assignmentDescription: t("assignApartment.unassignedUsers.description"),
            assignmentTitle: t("assignApartment.unassignedUsers.title", { count: unassignedUsers.length }),
            availableCountLabel: t("assignApartment.metrics.availableUnits.title"),
            availableDescription: t("assignApartment.availableUnits.description", { compound: compound.name }),
            availableTitle: t("assignApartment.availableUnits.title", { count: units.length }),
            buildingColumn: t("assignApartment.availableUnits.table.building"),
            emptyAssignmentDescription: t("assignApartment.unassignedUsers.empty.description"),
            emptyAssignmentTitle: t("assignApartment.unassignedUsers.empty.title"),
            emptyUnitsDescription: t("assignApartment.availableUnits.empty.description"),
            emptyUnitsTitle: t("assignApartment.availableUnits.empty.title"),
            noPhone: t("assignApartment.unassignedUsers.noPhone"),
            openRegistry: t("assignApartment.unassignedUsers.openRegistry"),
            paginationFirst: commonT("pagination.first"),
            paginationLast: commonT("pagination.last"),
            paginationNext: commonT("pagination.next"),
            paginationPrevious: commonT("pagination.previous"),
            paginationSummaryTemplate,
            residentsColumn: t("assignApartment.availableUnits.table.residents"),
            returnToDashboard: t("assignApartment.unassignedUsers.empty.returnToDashboard"),
            reviewCompoundRegistry: t("assignApartment.unassignedUsers.empty.reviewCompoundRegistry"),
            selectUnit: t("assignApartment.unassignedUsers.selectUnit"),
            statusColumn: t("assignApartment.availableUnits.table.status"),
            unitColumn: t("assignApartment.availableUnits.table.unit"),
            unitLabel: t("assignApartment.unassignedUsers.unitLabel"),
            unitOptionTemplate,
            unitSetupRequired: t("assignApartment.unassignedUsers.unitSetupRequired"),
            userColumn: t("assignApartment.unassignedUsers.table.user"),
          }}
          units={units}
          users={unassignedUsers}
        />
      </section>
    </main>
  );
}
