import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import { getBuilding, getCurrentUser, getUnit } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import { archiveUnitAction, updateUnitAction } from "../../../../actions";

interface EditUnitPageProps {
  params: Promise<{ buildingId: string; unitId: string }>;
}

export default async function EditUnitPage({ params }: EditUnitPageProps) {
  await requireAdminUser(getCurrentUser);
  const { buildingId, unitId } = await params;
  const [building, unit, t] = await Promise.all([getBuilding(buildingId), getUnit(unitId), getTranslations("Registry")]);

  if (!building || !unit) notFound();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href={`/units/${unit.id}`}>
              {t("backToUnit")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("editUnit")} {unit.unitNumber}</h1>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[1fr_0.8fr] lg:px-8">
        <form action={updateUnitAction.bind(null, building.id, unit.id)} className="rounded-lg border border-line bg-panel p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              {t("unitNumber")}
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="unitNumber" required defaultValue={unit.unitNumber} />
            </label>
            <label className="text-sm font-medium">
              {t("floor")}
              <select className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="floorId" defaultValue={unit.floorId ?? ""}>
                <option value="">{t("noFloor")}</option>
                {(building.floors ?? []).map((floor) => (
                  <option key={floor.id} value={floor.id}>{floor.label}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              {t("status")}
              <select className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="status" defaultValue={unit.status}>
                <option value="active">{t("active")}</option>
                <option value="vacant">{t("vacant")}</option>
                <option value="blocked">{t("blocked")}</option>
                <option value="archived">{t("archived")}</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              {t("bedrooms")}
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="bedrooms" type="number" min={0} defaultValue={unit.bedrooms ?? ""} />
            </label>
          </div>
          <button className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" type="submit">
            {t("saveChanges")}
          </button>
        </form>

        <form action={archiveUnitAction.bind(null, unit.id)} className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold text-danger">{t("archiveUnit")}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{t("archiveUnitDesc")}</p>
          <label className="mt-4 block text-sm font-medium">
            {t("reason")}
            <textarea className="mt-2 min-h-28 w-full rounded-lg border border-line px-3 py-2" name="reason" />
          </label>
          <button className="mt-4 inline-flex h-11 items-center justify-center rounded-lg border border-danger px-4 text-sm font-semibold text-danger" type="submit">
            {t("archive")}
          </button>
        </form>
      </section>
    </main>
  );
}
