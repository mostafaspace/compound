import Link from "next/link";
import { getCurrentUser, getPollTypes } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";
import { LogoutButton } from "@/components/logout-button";
import { createPollTypeAction, deletePollTypeAction } from "./actions";

export default async function PollTypesPage() {
  await requireAdminUser(getCurrentUser);
  const pollTypes = await getPollTypes();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/polls">
              {"<"} Polls
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">Poll Categories</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">Manage poll categories for your community.</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-8 px-5 py-6 lg:px-8">
        {/* Create form */}
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold">New Category</h2>
          <form action={createPollTypeAction} className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-xs font-semibold text-muted">
              Name *
              <input
                name="name"
                required
                className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                placeholder="e.g. Community Survey"
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              Description
              <input
                name="description"
                className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                placeholder="Optional"
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              Color
              <input
                name="color"
                type="color"
                defaultValue="#14b8a6"
                className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-2 text-sm"
              />
            </label>
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
              >
                Add Category
              </button>
            </div>
          </form>
        </div>

        {/* List */}
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold">
            Categories ({pollTypes.length})
          </h2>
          {pollTypes.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No categories yet. Create one above.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {pollTypes.map((pt) => (
                <li key={pt.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-block h-4 w-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: pt.color }}
                    />
                    <div>
                      <p className="text-sm font-semibold">{pt.name}</p>
                      {pt.description ? (
                        <p className="text-xs text-muted">{pt.description}</p>
                      ) : null}
                    </div>
                  </div>
                  <form action={deletePollTypeAction.bind(null, pt.id)}>
                    <button
                      type="submit"
                      className="inline-flex h-7 items-center rounded-lg border border-danger px-2 text-xs font-semibold text-danger hover:bg-[#fff3f2]"
                    >
                      Delete
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
