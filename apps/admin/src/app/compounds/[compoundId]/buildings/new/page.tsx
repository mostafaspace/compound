import Link from "next/link";
import { notFound } from "next/navigation";

import { getCompound, getCurrentUser } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import { createBuildingAction } from "../../../actions";

interface NewBuildingPageProps {
  params: Promise<{
    compoundId: string;
  }>;
}

export default async function NewBuildingPage({ params }: NewBuildingPageProps) {
  await requireAdminUser(getCurrentUser);
  const { compoundId } = await params;
  const compound = await getCompound(compoundId);

  if (!compound) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto max-w-4xl px-5 py-6 lg:px-8">
          <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href={`/compounds/${compound.id}`}>
            {compound.name}
          </Link>
          <h1 className="mt-2 text-3xl font-semibold">New building</h1>
          <p className="mt-2 text-sm text-muted">Add a physical building boundary before floors and units are created.</p>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-6 lg:px-8">
        <form action={createBuildingAction.bind(null, compound.id)} className="rounded-lg border border-line bg-panel p-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold">Building name</span>
              <input
                className="h-11 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                name="name"
                placeholder="Building A"
                required
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Code</span>
              <input
                className="h-11 rounded-lg border border-line px-3 font-mono text-sm uppercase outline-none focus:border-brand"
                name="code"
                placeholder="A"
                required
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Sort order</span>
              <input
                className="h-11 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                defaultValue={0}
                min={0}
                name="sortOrder"
                type="number"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand"
              href={`/compounds/${compound.id}`}
            >
              Cancel
            </Link>
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
              type="submit"
            >
              Create building
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
