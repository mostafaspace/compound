import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { OrgChartView } from "@/components/orgchart-view";
import { SiteNav } from "@/components/site-nav";
import { getCompound, getCurrentUser, getUsers } from "@/lib/api";
import { toAdminUserOption } from "@/lib/admin-user-options";
import { hasEffectiveRole } from "@/lib/auth-access";
import { getCompoundOrgChart } from "@/lib/orgchart-actions";
import { requireAdminUser } from "@/lib/session";

interface OrgChartPageProps {
  params: Promise<{
    compoundId: string;
  }>;
}

export default async function OrgChartPage({ params }: OrgChartPageProps) {
  const { compoundId } = await params;
  const currentUser = await requireAdminUser(getCurrentUser);
  const t = await getTranslations("OrgChart");
  const navT = await getTranslations("Navigation");
  const canManage = hasEffectiveRole(currentUser, "super_admin") || hasEffectiveRole(currentUser, "compound_admin");

  const [compound, orgChart, assignableUsers] = await Promise.all([
    getCompound(compoundId),
    getCompoundOrgChart(compoundId),
    getUsers({ perPage: 100, status: "active" }),
  ]);

  if (!compound || !orgChart) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[
        { label: t("breadcrumbs.compounds"), href: "/compounds" },
        { label: compound.name, href: `/compounds/${compound.id}` },
        { label: t("title") },
      ]} />

      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <h1 className="text-3xl font-semibold">{t("title")}</h1>
            <p className="mt-2 text-sm text-muted">{t("subtitle")}</p>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
                href="/representative-assignments"
              >
                {navT("representatives")}
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
                href={`/compounds/${compound.id}/representatives`}
              >
                {t("manageRoles")}
              </Link>
            </div>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <OrgChartView
          assignableUsers={assignableUsers.map(toAdminUserOption)}
          data={orgChart}
          compoundId={compound.id}
          canManage={canManage}
        />
      </section>
    </main>
  );
}
