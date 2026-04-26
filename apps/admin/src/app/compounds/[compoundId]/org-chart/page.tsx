import Link from "next/link";
import { notFound } from "next/navigation";

import { OrgChartView } from "@/components/orgchart-view";
import { SiteNav } from "@/components/site-nav";
import { getCompound, getCurrentUser } from "@/lib/api";
import { getCompoundOrgChart } from "@/lib/orgchart";
import { requireAdminUser } from "@/lib/session";

interface OrgChartPageProps {
  params: Promise<{
    compoundId: string;
  }>;
}

export default async function OrgChartPage({ params }: OrgChartPageProps) {
  const { compoundId } = await params;
  const currentUser = await getCurrentUser();
  const canManage = currentUser?.role === "super_admin" || currentUser?.role === "compound_admin";

  if (canManage) {
    await requireAdminUser(getCurrentUser);
  }

  const [compound, orgChart] = await Promise.all([getCompound(compoundId), getCompoundOrgChart(compoundId)]);

  if (!compound || !orgChart) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[
        { label: "Compounds", href: "/compounds" },
        { label: compound.name, href: `/compounds/${compound.id}` },
        { label: "Org Chart" },
      ]} />

      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <h1 className="text-3xl font-semibold">Organization Chart</h1>
            <p className="mt-2 text-sm text-muted">View and manage organizational structure</p>
          </div>
          {canManage && (
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
              href={`/compounds/${compound.id}/representatives`}
            >
              Manage roles
            </Link>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <OrgChartView data={orgChart} compoundId={compound.id} canManage={canManage} />
      </section>
    </main>
  );
}
