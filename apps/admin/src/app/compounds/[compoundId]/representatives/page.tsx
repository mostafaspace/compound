import Link from "next/link";
import { notFound } from "next/navigation";

import { RepresentativesList } from "@/components/representatives-list";
import { SiteNav } from "@/components/site-nav";
import { getCompound, getCurrentUser } from "@/lib/api";
import { listRepresentativeAssignments } from "@/lib/orgchart";
import { requireAdminUser } from "@/lib/session";

interface RepresentativesPageProps {
  params: Promise<{
    compoundId: string;
  }>;
}

export default async function RepresentativesPage({ params }: RepresentativesPageProps) {
  const { compoundId } = await params;
  await requireAdminUser(getCurrentUser);

  const [compound, assignments] = await Promise.all([getCompound(compoundId), listRepresentativeAssignments(compoundId)]);

  if (!compound) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[
        { label: "Compounds", href: "/compounds" },
        { label: compound.name, href: `/compounds/${compound.id}` },
        { label: "Representatives" },
      ]} />

      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <h1 className="text-3xl font-semibold">Representative Assignments</h1>
            <p className="mt-2 text-sm text-muted">Manage organizational roles and responsibilities</p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
            href={`/compounds/${compound.id}/org-chart`}
          >
            View chart
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <RepresentativesList assignments={assignments} compoundId={compound.id} />
      </section>
    </main>
  );
}
