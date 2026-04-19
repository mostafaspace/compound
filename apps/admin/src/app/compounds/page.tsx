import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { getCompounds, getCurrentUser } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

function BuildingIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M3 3.75A1.75 1.75 0 0 1 4.75 2h6.5A1.75 1.75 0 0 1 13 3.75V18h2.25a.75.75 0 0 0 .75-.75V8.75A1.75 1.75 0 0 0 14.25 7H14V3.75A2.75 2.75 0 0 0 11.25 1h-6.5A2.75 2.75 0 0 0 2 3.75v13.5c0 .414.336.75.75.75H5v-3.25A1.75 1.75 0 0 1 6.75 13h1.5A1.75 1.75 0 0 1 10 14.75V18h2V3.75A.75.75 0 0 0 11.25 3h-6.5A.75.75 0 0 0 4 3.75V18H2.75A1.75 1.75 0 0 1 1 16.25V3.75ZM6 6a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm4 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM7 10a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm4-1a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z" />
    </svg>
  );
}

export default async function CompoundsPage() {
  await requireAdminUser(getCurrentUser);
  const compounds = await getCompounds();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/">
              Dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">Property registry</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Compounds are the top-level operating boundary for users, units, finance, governance, and security.
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-strong"
            href="/compounds/new"
          >
            New compound
          </Link>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        {compounds.length === 0 ? (
          <div className="rounded-lg border border-line bg-panel p-6">
            <div className="flex size-11 items-center justify-center rounded-lg bg-[#e6f3ef] text-brand">
              <BuildingIcon />
            </div>
            <h2 className="mt-5 text-xl font-semibold">No compounds loaded</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Start the Laravel API and seed the database to load local compounds. You can also create the first compound once
              the API is running.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-line bg-panel">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-background text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Compound</th>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Units</th>
                  <th className="px-4 py-3 font-semibold">Buildings</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {compounds.map((compound) => (
                  <tr key={compound.id}>
                    <td className="px-4 py-4">
                      <Link className="font-semibold text-brand hover:text-brand-strong" href={`/compounds/${compound.id}`}>
                        {compound.name}
                      </Link>
                      <div className="text-muted">{compound.legalName ?? "No legal name"}</div>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs">{compound.code}</td>
                    <td className="px-4 py-4">{compound.unitsCount ?? 0}</td>
                    <td className="px-4 py-4">{compound.buildingsCount ?? 0}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-lg bg-[#e6f3ef] px-2.5 py-1 text-xs font-semibold capitalize text-brand">
                        {compound.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold hover:border-brand"
                        href={`/compounds/${compound.id}/edit`}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
