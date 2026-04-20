import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { VisitorGateWorkspace } from "@/components/visitors/visitor-gate-workspace";
import { getCurrentUser, getVisitorRequests } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

export default async function VisitorsPage() {
  const user = await requireAdminUser(getCurrentUser, [
    "super_admin",
    "compound_admin",
    "support_agent",
    "security_guard",
  ]);
  const visitors = await getVisitorRequests();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase text-brand">Visitor security</p>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Gate operations</h1>
            <p className="mt-2 text-sm text-muted">
              Signed in as {user.name} / {user.role.replaceAll("_", " ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold text-foreground transition hover:border-brand"
              href="/"
            >
              Control center
            </Link>
            <Link
              className="inline-flex h-11 items-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold text-foreground transition hover:border-brand"
              href="/onboarding"
            >
              Onboarding
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        <VisitorGateWorkspace initialVisitors={visitors} />
      </section>
    </main>
  );
}
