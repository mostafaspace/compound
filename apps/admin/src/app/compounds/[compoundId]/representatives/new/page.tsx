import Link from "next/link";
import { notFound } from "next/navigation";

import { NewAssignmentForm } from "@/components/new-assignment-form";
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
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href={`/compounds/${compound.id}/representatives`}>
              Representative Assignments
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">Assign New Representative</h1>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-5 py-8 lg:px-8">
        <NewAssignmentForm compoundId={compound.id} />
      </section>
    </main>
  );
}
