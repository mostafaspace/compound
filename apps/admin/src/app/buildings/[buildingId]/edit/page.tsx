import Link from "next/link";
import { notFound } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { getBuilding, getCurrentUser } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import { archiveBuildingAction, updateBuildingAction } from "../../actions";

interface EditBuildingPageProps {
  params: Promise<{ buildingId: string }>;
}

export default async function EditBuildingPage({ params }: EditBuildingPageProps) {
  await requireAdminUser(getCurrentUser);
  const { buildingId } = await params;
  const building = await getBuilding(buildingId);

  if (!building) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href={`/buildings/${building.id}`}>
              Back to building
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">Edit {building.name}</h1>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[1fr_0.8fr] lg:px-8">
        <form action={updateBuildingAction.bind(null, building.id)} className="rounded-lg border border-line bg-panel p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Name
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="name" required defaultValue={building.name} />
            </label>
            <label className="text-sm font-medium">
              Code
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3 font-mono" name="code" required defaultValue={building.code} />
            </label>
            <label className="text-sm font-medium">
              Sort order
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="sortOrder" type="number" min={0} defaultValue={building.sortOrder} />
            </label>
          </div>
          <button className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" type="submit">
            Save changes
          </button>
        </form>

        <form action={archiveBuildingAction.bind(null, building.id)} className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold text-danger">Archive building</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Archived buildings stay available for historical finance, visitor, issue, and document references.</p>
          <label className="mt-4 block text-sm font-medium">
            Reason
            <textarea className="mt-2 min-h-28 w-full rounded-lg border border-line px-3 py-2" name="reason" />
          </label>
          <button className="mt-4 inline-flex h-11 items-center justify-center rounded-lg border border-danger px-4 text-sm font-semibold text-danger" type="submit">
            Archive
          </button>
        </form>
      </section>
    </main>
  );
}
