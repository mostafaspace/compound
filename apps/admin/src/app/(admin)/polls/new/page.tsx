import Link from "next/link";
import { getCurrentUser, getCompounds, getPollTypes } from "@/lib/api";
import { hasEffectiveRole } from "@/lib/auth-access";
import { getCompoundContext, requireAdminUser } from "@/lib/session";
import { SiteNav } from "@/components/site-nav";
import { PollCreateForm } from "./poll-create-form";

export default async function NewPollPage() {
  await requireAdminUser(getCurrentUser);
  const [currentUser, compounds, activeCompoundId, pollTypes] = await Promise.all([
    getCurrentUser(),
    getCompounds(),
    getCompoundContext(),
    getPollTypes(),
  ]);

  const isSuperAdmin = currentUser ? hasEffectiveRole(currentUser, "super_admin") : false;
  const defaultCompoundId = activeCompoundId ?? compounds[0]?.id ?? "";
  const lockedCompound = compounds.find((c) => c.id === defaultCompoundId) ?? compounds[0] ?? null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[{ label: "Polls", href: "/polls" }, { label: "New Poll" }]} />
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/polls">
              {"<"} Polls
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">New Poll</h1>
            <p className="mt-2 text-sm text-muted">Create a new community poll.</p>
          </div>

        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 py-6 lg:px-8">
        <PollCreateForm
          isSuperAdmin={isSuperAdmin}
          compounds={compounds}
          defaultCompoundId={defaultCompoundId}
          lockedCompound={lockedCompound}
          pollTypes={pollTypes}
        />
      </section>
    </main>
  );
}
