import Link from "next/link";
import { notFound } from "next/navigation";

import { EditAssignmentForm } from "@/components/edit-assignment-form";
import { getRepresentativeAssignment } from "@/lib/orgchart-actions";

interface EditRepresentativePageProps {
  params: Promise<{
    assignmentId: string;
  }>;
}

export default async function EditRepresentativePage({ params }: EditRepresentativePageProps) {
  const { assignmentId } = await params;
  const assignment = await getRepresentativeAssignment(assignmentId);

  if (!assignment) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href={`/compounds/${assignment.compoundId}/representatives`}>
              Representative Assignments
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">Edit Assignment</h1>
            <p className="mt-2 text-sm text-muted">{assignment.user?.name ?? "Unknown"}</p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-5 py-8 lg:px-8">
        <EditAssignmentForm assignment={assignment} />
      </section>
    </main>
  );
}
