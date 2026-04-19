import Link from "next/link";

import { getCurrentUser } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import { createCompoundAction } from "../actions";

export default async function NewCompoundPage() {
  await requireAdminUser(getCurrentUser);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto max-w-4xl px-5 py-6 lg:px-8">
          <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/compounds">
            Property registry
          </Link>
          <h1 className="mt-2 text-3xl font-semibold">New compound</h1>
          <p className="mt-2 text-sm text-muted">
            Create the operating boundary before importing buildings, floors, units, residents, finance balances, and staff.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-6 lg:px-8">
        <form action={createCompoundAction} className="rounded-lg border border-line bg-panel p-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold">Compound name</span>
              <input
                className="h-11 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                name="name"
                placeholder="Nile Gardens"
                required
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Code</span>
              <input
                className="h-11 rounded-lg border border-line px-3 font-mono text-sm uppercase outline-none focus:border-brand"
                name="code"
                placeholder="NILE-GARDENS"
                required
              />
            </label>

            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-semibold">Legal name</span>
              <input
                className="h-11 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                name="legalName"
                placeholder="Nile Gardens Owners Association"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Timezone</span>
              <select className="h-11 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand" name="timezone">
                <option value="Africa/Cairo">Africa/Cairo</option>
                <option value="UTC">UTC</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Currency</span>
              <select className="h-11 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand" name="currency">
                <option value="EGP">EGP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand"
              href="/compounds"
            >
              Cancel
            </Link>
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
              type="submit"
            >
              Create compound
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
