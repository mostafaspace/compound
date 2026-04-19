import Link from "next/link";
import { notFound } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { getBuilding, getCurrentUser, getUnit } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import { archiveUnitAction, updateUnitAction } from "../../../../actions";

interface EditUnitPageProps {
  params: Promise<{ buildingId: string; unitId: string }>;
}

export default async function EditUnitPage({ params }: EditUnitPageProps) {
  await requireAdminUser(getCurrentUser);
  const { buildingId, unitId } = await params;
  const [building, unit] = await Promise.all([getBuilding(buildingId), getUnit(unitId)]);

  if (!building || !unit) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href={`/units/${unit.id}`}>
              Back to unit
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">Edit unit {unit.unitNumber}</h1>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[1fr_0.8fr] lg:px-8">
        <form action={updateUnitAction.bind(null, building.id, unit.id)} className="rounded-lg border border-line bg-panel p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Unit number
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="unitNumber" required defaultValue={unit.unitNumber} />
            </label>
            <label className="text-sm font-medium">
              Floor
              <select className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="floorId" defaultValue={unit.floorId ?? ""}>
                <option value="">No floor</option>
                {(building.floors ?? []).map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Type
              <select className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="type" defaultValue={unit.type}>
                <option value="apartment">Apartment</option>
                <option value="villa">Villa</option>
                <option value="duplex">Duplex</option>
                <option value="retail">Retail</option>
                <option value="office">Office</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Status
              <select className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="status" defaultValue={unit.status}>
                <option value="active">Active</option>
                <option value="vacant">Vacant</option>
                <option value="blocked">Blocked</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Area sqm
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="areaSqm" type="number" step="0.01" defaultValue={unit.areaSqm ?? ""} />
            </label>
            <label className="text-sm font-medium">
              Bedrooms
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="bedrooms" type="number" min={0} defaultValue={unit.bedrooms ?? ""} />
            </label>
          </div>
          <button className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" type="submit">
            Save changes
          </button>
        </form>

        <form action={archiveUnitAction.bind(null, unit.id)} className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold text-danger">Archive unit</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Archived units remain linked to historical balances, documents, issues, and visitor logs.</p>
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
