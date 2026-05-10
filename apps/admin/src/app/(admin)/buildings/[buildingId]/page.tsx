import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getBuilding, getCurrentUser } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

interface BuildingDetailPageProps {
  params: Promise<{ buildingId: string }>;
}

export default async function BuildingDetailPage({ params }: BuildingDetailPageProps) {
  await requireAdminUser(getCurrentUser);
  const { buildingId } = await params;
  const [building, t] = await Promise.all([getBuilding(buildingId), getTranslations("Registry")]);

  if (!building) notFound();

  const floors = building.floors ?? [];
  const units = building.units ?? [];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href={`/compounds/${building.compoundId}`}>
              {t("backToCompound")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{building.name}</h1>
            <p className="mt-2 text-sm text-muted">
              {building.code} / {building.floorsCount ?? floors.length} {t("floors").toLowerCase()} / {building.unitsCount ?? units.length} {t("units").toLowerCase()}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
              href={`/buildings/${building.id}/edit`}
            >
              {t("editBuilding")}
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-strong"
              href={`/buildings/${building.id}/floors/new`}
            >
              {t("newFloor")}
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
              href={`/buildings/${building.id}/units/new`}
            >
              {t("newUnit")}
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-lg font-semibold">{t("floors")}</h2>
          </div>
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("label")}</th>
                <th className="px-4 py-3 font-semibold">{t("level")}</th>
                <th className="px-4 py-3 font-semibold">{t("units")}</th>
                <th className="px-4 py-3 font-semibold">{t("status")}</th>
                <th className="px-4 py-3 font-semibold">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {floors.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted" colSpan={5}>{t("noFloors")}</td>
                </tr>
              ) : (
                floors.map((floor) => (
                  <tr key={floor.id}>
                    <td className="px-4 py-4 font-semibold">{floor.label}</td>
                    <td className="px-4 py-4">{floor.levelNumber}</td>
                    <td className="px-4 py-4">{floor.unitsCount ?? 0}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-lg bg-[#e6f3ef] px-2.5 py-1 text-xs font-semibold capitalize text-brand">
                        {floor.archivedAt ? t("archived") : t("active")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold hover:border-brand"
                        href={`/buildings/${building.id}/floors/${floor.id}/edit`}
                      >
                        {t("edit")}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-lg font-semibold">{t("units")}</h2>
          </div>
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("unit")}</th>
                <th className="px-4 py-3 font-semibold">{t("floor")}</th>
                <th className="px-4 py-3 font-semibold">{t("residents")}</th>
                <th className="px-4 py-3 font-semibold">{t("status")}</th>
                <th className="px-4 py-3 font-semibold">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {units.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted" colSpan={4}>{t("noUnits")}</td>
                </tr>
              ) : (
                units.map((unit) => (
                  <tr key={unit.id}>
                    <td className="px-4 py-4">
                      <Link className="font-semibold text-brand hover:text-brand-strong" href={`/units/${unit.id}`}>
                        {unit.unitNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-muted">{unit.floorId ? floors.find(f => f.id === unit.floorId)?.label ?? "—" : "—"}</td>
                    <td className="px-4 py-4">{unit.memberships?.length ?? 0}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-lg bg-[#e6f3ef] px-2.5 py-1 text-xs font-semibold capitalize text-brand">
                        {unit.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold hover:border-brand"
                        href={`/buildings/${building.id}/units/${unit.id}/edit`}
                      >
                        {t("edit")}
                      </Link>
                    </td>
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
