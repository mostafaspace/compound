import Link from "next/link";
import { notFound } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { getCompound, getCurrentUser } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import { archiveCompoundAction, updateCompoundAction } from "../../actions";

interface EditCompoundPageProps {
  params: Promise<{ compoundId: string }>;
}

export default async function EditCompoundPage({ params }: EditCompoundPageProps) {
  await requireAdminUser(getCurrentUser);
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
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href={`/compounds/${compound.id}`}>
              Back to compound
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">Edit {compound.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Keep legal identity, timezone, currency, and operating status accurate before downstream modules use this property.
            </p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[1fr_0.8fr] lg:px-8">
        <form action={updateCompoundAction.bind(null, compound.id)} className="rounded-lg border border-line bg-panel p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Name
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="name" required defaultValue={compound.name} />
            </label>
            <label className="text-sm font-medium">
              Code
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3 font-mono" name="code" required defaultValue={compound.code} />
            </label>
            <label className="text-sm font-medium md:col-span-2">
              Legal name
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="legalName" defaultValue={compound.legalName ?? ""} />
            </label>
            <label className="text-sm font-medium">
              Timezone
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="timezone" required defaultValue={compound.timezone} />
            </label>
            <label className="text-sm font-medium">
              Currency
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3 uppercase" name="currency" required defaultValue={compound.currency} maxLength={3} />
            </label>
            <label className="text-sm font-medium">
              Status
              <select className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="status" defaultValue={compound.status}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>
          <button className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" type="submit">
            Save changes
          </button>
        </form>

        <form action={archiveCompoundAction.bind(null, compound.id)} className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold text-danger">Archive compound</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Archiving keeps historical records available but marks the compound as no longer active for operations.
          </p>
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
