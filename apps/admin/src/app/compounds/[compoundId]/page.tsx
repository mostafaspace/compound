import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { SiteNav } from "@/components/site-nav";
import { getCompound, getCurrentUser } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

interface CompoundDetailPageProps {
  params: Promise<{ compoundId: string }>;
}

export default async function CompoundDetailPage({ params }: CompoundDetailPageProps) {
  await requireAdminUser(getCurrentUser);
  const { compoundId } = await params;
  const [compound, t] = await Promise.all([getCompound(compoundId), getTranslations("Registry")]);

  if (!compound) notFound();

  const buildings = compound.buildings ?? [];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[{ label: t("propertyRegistry"), href: "/compounds" }, { label: compound.name }]} />

      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <h1 className="text-3xl font-semibold">{compound.name}</h1>
            <p className="mt-2 text-sm text-muted">
              {compound.code} / {compound.currency} / {compound.timezone}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
              href={`/compounds/${compound.id}/onboarding`}
            >
              {t("onboardingChecklist")}
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
              href={`/compounds/${compound.id}/org-chart`}
            >
              {t("orgChart")}
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
              href={`/compounds/${compound.id}/edit`}
            >
              {t("editCompound")}
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-strong"
              href={`/compounds/${compound.id}/buildings/new`}
            >
              {t("newBuilding")}
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 md:grid-cols-3 lg:px-8">
        <article className="rounded-lg border border-line bg-panel p-5">
          <p className="text-sm font-medium text-muted">{t("buildings")}</p>
          <p className="mt-3 text-3xl font-semibold text-brand">{compound.buildingsCount ?? buildings.length}</p>
        </article>
        <article className="rounded-lg border border-line bg-panel p-5">
          <p className="text-sm font-medium text-muted">{t("units")}</p>
          <p className="mt-3 text-3xl font-semibold text-accent">{compound.unitsCount ?? 0}</p>
        </article>
        <article className="rounded-lg border border-line bg-panel p-5">
          <p className="text-sm font-medium text-muted">{t("status")}</p>
          <p className="mt-3 text-3xl font-semibold capitalize text-brand-strong">{compound.status}</p>
        </article>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 lg:px-8">
        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("building")}</th>
                <th className="px-4 py-3 font-semibold">{t("code")}</th>
                <th className="px-4 py-3 font-semibold">{t("floors")}</th>
                <th className="px-4 py-3 font-semibold">{t("units")}</th>
                <th className="px-4 py-3 font-semibold">{t("order")}</th>
                <th className="px-4 py-3 font-semibold">{t("status")}</th>
                <th className="px-4 py-3 font-semibold">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {buildings.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted" colSpan={7}>{t("noBuildings")}</td>
                </tr>
              ) : (
                buildings.map((building) => (
                  <tr key={building.id}>
                    <td className="px-4 py-4">
                      <Link className="font-semibold text-brand hover:text-brand-strong" href={`/buildings/${building.id}`}>
                        {building.name}
                      </Link>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs">{building.code}</td>
                    <td className="px-4 py-4">{building.floorsCount ?? 0}</td>
                    <td className="px-4 py-4">{building.unitsCount ?? 0}</td>
                    <td className="px-4 py-4">{building.sortOrder}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-lg bg-[#e6f3ef] px-2.5 py-1 text-xs font-semibold capitalize text-brand">
                        {building.archivedAt ? t("archived") : t("active")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold hover:border-brand"
                        href={`/buildings/${building.id}/edit`}
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
