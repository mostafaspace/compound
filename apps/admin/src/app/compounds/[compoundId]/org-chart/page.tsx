import Link from "next/link";
import { notFound } from "next/navigation";

import { OrgChartView } from "@/components/orgchart-view";
import { LogoutButton } from "@/components/logout-button";
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
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href={`/compounds/${compound.id}`}>
              {compound.name}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">Organization Chart</h1>
            <p className="mt-2 text-sm text-muted">View and manage organizational structure</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canManage && (
              <Link
                className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
                href={`/compounds/${compound.id}/representatives`}
              >
                Manage roles
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <OrgChartView data={orgChart} compoundId={compound.id} canManage={canManage} />
      </section>
    </main>
  );
}
