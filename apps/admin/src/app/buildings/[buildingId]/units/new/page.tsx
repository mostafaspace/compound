import Link from "next/link";
import { notFound } from "next/navigation";

import { getBuilding, getCurrentUser } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import { createUnitAction } from "../../../actions";

interface NewUnitPageProps {
  params: Promise<{
    buildingId: string;
  }>;
}

export default async function NewUnitPage({ params }: NewUnitPageProps) {
  await requireAdminUser(getCurrentUser);
  const { buildingId } = await params;
  const building = await getBuilding(buildingId);

  if (!building) {
    notFound();
  }

  const floors = building.floors ?? [];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto max-w-4xl px-5 py-6 lg:px-8">
          <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href={`/buildings/${building.id}`}>
            {building.name}
          </Link>
          <h1 className="mt-2 text-3xl font-semibold">New unit</h1>
          <p className="mt-2 text-sm text-muted">
            Create a billable unit. Specific type and area are less important.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-6 lg:px-8">
        <form action={createUnitAction.bind(null, building.id)} className="rounded-lg border border-line bg-panel p-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold">Unit number</span>
              <input
                className="h-11 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                name="unitNumber"
                placeholder="101"
                required
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Floor</span>
              <select className="h-11 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand" name="floorId">
                <option value="">No floor</option>
                {floors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Status</span>
              <select className="h-11 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand" name="status">
                <option value="active">Active</option>
                <option value="vacant">Vacant</option>
                <option value="blocked">Blocked</option>
                <option value="archived">Archived</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Bedrooms</span>
              <input
                className="h-11 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                min={0}
                name="bedrooms"
                type="number"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand"
              href={`/buildings/${building.id}`}
            >
              Cancel
            </Link>
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
              type="submit"
            >
              Create unit
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
