import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { SiteNav } from "@/components/site-nav";
import { getCompounds, getCurrentUser } from "@/lib/api";
import { hasEffectiveRole, requireAdminUser } from "@/lib/session";

function BuildingIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M3 3.75A1.75 1.75 0 0 1 4.75 2h6.5A1.75 1.75 0 0 1 13 3.75V18h2.25a.75.75 0 0 0 .75-.75V8.75A1.75 1.75 0 0 0 14.25 7H14V3.75A2.75 2.75 0 0 0 11.25 1h-6.5A2.75 2.75 0 0 0 2 3.75v13.5c0 .414.336.75.75.75H5v-3.25A1.75 1.75 0 0 1 6.75 13h1.5A1.75 1.75 0 0 1 10 14.75V18h2V3.75A.75.75 0 0 0 11.25 3h-6.5A.75.75 0 0 0 4 3.75V18H2.75A1.75 1.75 0 0 1 1 16.25V3.75ZM6 6a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm4 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM7 10a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm4-1a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z" />
    </svg>
  );
}

export default async function CompoundsPage() {
  const user = await requireAdminUser(getCurrentUser);

  // Compound admins are scoped to their own compound — skip the list entirely
  if (hasEffectiveRole(user, "compound_admin") && user.compoundId) {
    redirect(`/compounds/${user.compoundId}`);
  }

  const [compounds, t] = await Promise.all([getCompounds(), getTranslations("Registry")]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[{ label: t("propertyRegistry") }]} />

      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <h1 className="text-3xl font-semibold">{t("propertyRegistry")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{t("propertyRegistryDesc")}</p>
          </div>
          {hasEffectiveRole(user, "super_admin") && (
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-strong"
              href="/compounds/new"
            >
              {t("newCompound")}
            </Link>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        {compounds.length === 0 ? (
          <div className="rounded-lg border border-line bg-panel p-6">
            <div className="flex size-11 items-center justify-center rounded-lg bg-[#e6f3ef] text-brand">
              <BuildingIcon />
            </div>
            <h2 className="mt-5 text-xl font-semibold">{t("noCompoundsTitle")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{t("noCompoundsDesc")}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-line bg-panel">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-background text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("compound")}</th>
                  <th className="px-4 py-3 font-semibold">{t("code")}</th>
                  <th className="px-4 py-3 font-semibold">{t("units")}</th>
                  <th className="px-4 py-3 font-semibold">{t("buildings")}</th>
                  <th className="px-4 py-3 font-semibold">{t("status")}</th>
                  <th className="px-4 py-3 font-semibold">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {compounds.map((compound) => (
                  <tr key={compound.id}>
                    <td className="px-4 py-4">
                      <Link className="font-semibold text-brand hover:text-brand-strong" href={`/compounds/${compound.id}`}>
                        {compound.name}
                      </Link>
                      <div className="text-muted">{compound.legalName ?? t("noLegalName")}</div>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs">{compound.code}</td>
                    <td className="px-4 py-4">{compound.unitsCount ?? 0}</td>
                    <td className="px-4 py-4">{compound.buildingsCount ?? 0}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-lg bg-[#e6f3ef] px-2.5 py-1 text-xs font-semibold capitalize text-brand">
                        {compound.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold hover:border-brand"
                        href={`/compounds/${compound.id}/edit`}
                      >
                        {t("edit")}
                      </Link>
                    </td>
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
