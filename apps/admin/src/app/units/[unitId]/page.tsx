import Link from "next/link";
import { notFound } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getUnit } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import { endMembershipAction, inviteResidentToUnitAction } from "../actions";

interface UnitDetailPageProps {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ invited?: string }>;
}

export default async function UnitDetailPage({ params, searchParams }: UnitDetailPageProps) {
  await requireAdminUser(getCurrentUser);
  const { unitId } = await params;
  const { invited } = await searchParams;
  const unit = await getUnit(unitId);

  if (!unit) {
    notFound();
  }

  const memberships = unit.memberships ?? [];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href={`/buildings/${unit.buildingId}`}>
              Back to building
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">Unit {unit.unitNumber}</h1>
            <p className="mt-2 text-sm text-muted">
              {unit.type} / {unit.areaSqm ? `${unit.areaSqm} sqm` : "Area not set"} / {unit.status}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand" href={`/buildings/${unit.buildingId}/units/${unit.id}/edit`}>
              Edit unit
            </Link>
            <Link className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" href="/documents">
              Documents
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-lg font-semibold">Unit memberships</h2>
          </div>
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Relation</th>
                <th className="px-4 py-3 font-semibold">Verification</th>
                <th className="px-4 py-3 font-semibold">Dates</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {memberships.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted" colSpan={5}>
                    No linked users yet.
                  </td>
                </tr>
              ) : (
                memberships.map((membership) => (
                  <tr key={membership.id}>
                    <td className="px-4 py-4">
                      <div className="font-semibold">{membership.user?.name ?? `User ${membership.userId}`}</div>
                      <div className="text-muted">{membership.user?.email ?? "No email"}</div>
                    </td>
                    <td className="px-4 py-4 capitalize">{membership.relationType}</td>
                    <td className="px-4 py-4 capitalize">{membership.verificationStatus.replace("_", " ")}</td>
                    <td className="px-4 py-4">
                      {membership.startsAt ?? "No start"} - {membership.endsAt ?? "Current"}
                    </td>
                    <td className="px-4 py-4">
                      {membership.endsAt ? (
                        <span className="text-muted">Ended</span>
                      ) : (
                        <form action={endMembershipAction.bind(null, unit.id, membership.id)}>
                          <button className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold hover:border-danger hover:text-danger" type="submit">
                            End
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <form action={inviteResidentToUnitAction.bind(null, unit.id)} className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold">Invite resident</h2>
          {invited ? (
            <p className="mt-2 rounded-lg bg-[#e6f3ef] px-3 py-2 text-sm font-medium text-brand">
              Invitation created. Delivery is handled by the notification slice.
            </p>
          ) : null}
          <div className="mt-4 grid gap-4">
            <label className="text-sm font-medium">
              Name
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="name" required />
            </label>
            <label className="text-sm font-medium">
              Email
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="email" type="email" required />
            </label>
            <label className="text-sm font-medium">
              Phone
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="phone" />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">
                Role
                <select className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="role" defaultValue="resident_owner">
                  <option value="resident_owner">Resident owner</option>
                  <option value="resident_tenant">Resident tenant</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Relation
                <select className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="relationType" defaultValue="resident">
                  <option value="owner">Owner</option>
                  <option value="tenant">Tenant</option>
                  <option value="resident">Resident</option>
                  <option value="representative">Representative</option>
                </select>
              </label>
            </div>
            <label className="text-sm font-medium">
              Start date
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="startsAt" type="date" />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input className="size-4" name="isPrimary" type="checkbox" />
              Primary contact for this unit
            </label>
          </div>
          <button className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" type="submit">
            Create invite
          </button>
        </form>
      </section>
    </main>
  );
}
