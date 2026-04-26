import { notFound } from "next/navigation";

import { NewAssignmentForm } from "@/components/new-assignment-form";
import { SiteNav } from "@/components/site-nav";
import { getCompound } from "@/lib/api";

interface NewRepresentativePageProps {
  params: Promise<{
    compoundId: string;
  }>;
}

export default async function NewRepresentativePage({ params }: NewRepresentativePageProps) {
  const { compoundId } = await params;
  const compound = await getCompound(compoundId);

  if (!compound) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[
        { label: "Compounds", href: "/compounds" },
        { label: compound.name, href: `/compounds/${compound.id}` },
        { label: "Representatives", href: `/compounds/${compound.id}/representatives` },
        { label: "New Assignment" },
      ]} />

      <header className="border-b border-line bg-panel">
        <div className="mx-auto max-w-2xl px-5 py-6 lg:px-8">
          <h1 className="text-3xl font-semibold">Assign New Representative</h1>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-5 py-8 lg:px-8">
        <NewAssignmentForm compoundId={compound.id} />
      </section>
    </main>
  );
}
