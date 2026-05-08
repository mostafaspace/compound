import Link from "next/link";

import { SiteNav } from "@/components/site-nav";
import { getCurrentUser, listViolationRules } from "@/lib/api";
import { getCompoundContext, requireAdminUser } from "@/lib/session";

import { archiveViolationRuleAction } from "./actions";

interface ViolationRulesPageProps {
  searchParams?: Promise<{
    archived?: string;
    created?: string;
    error?: string;
    updated?: string;
  }>;
}

export default async function ViolationRulesPage({ searchParams }: ViolationRulesPageProps) {
  const user = await requireAdminUser(getCurrentUser);
  const params = searchParams ? await searchParams : {};
  const compoundId = (await getCompoundContext()) ?? user.compoundId;
  const rules = compoundId ? await listViolationRules(compoundId) : [];
  const activeRules = rules.filter((rule) => rule.isActive).length;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[{ label: "Violation rules" }]} />

      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/">
              Back to dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Violation rules</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted">
              Maintain the fine catalog admins use when applying apartment-level violations.
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-strong"
            href="/violation-rules/new"
          >
            New rule
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-5 px-5 py-6 lg:px-8">
        {params.created ? <StatusBanner text="Violation rule created." /> : null}
        {params.updated ? <StatusBanner text="Violation rule updated." /> : null}
        {params.archived ? <StatusBanner text="Violation rule archived." /> : null}
        {params.error === "compound" || !compoundId ? (
          <div className="rounded-lg border border-[#e7d7a9] bg-[#fff8e8] px-4 py-3 text-sm text-[#7a5d1a]">
            Choose an active compound before managing violation rules.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Total rules" value={rules.length} />
          <MetricCard label="Active rules" value={activeRules} />
          <MetricCard label="Archived / paused" value={rules.length - activeRules} />
        </div>

        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="bg-background text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">Rule</th>
                  <th className="px-4 py-3 text-start font-semibold">Default fee</th>
                  <th className="px-4 py-3 text-start font-semibold">Status</th>
                  <th className="px-4 py-3 text-start font-semibold">Updated</th>
                  <th className="px-4 py-3 text-start font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rules.length > 0 ? (
                  rules.map((rule) => (
                    <tr className="hover:bg-background/60" key={rule.id}>
                      <td className="px-4 py-4">
                        <div className="font-semibold">{rule.name}</div>
                        <div className="mt-1 text-xs text-muted">{rule.nameAr ?? "No Arabic label"}</div>
                        {rule.description ? (
                          <div className="mt-1 max-w-xl text-xs leading-5 text-muted">{rule.description}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 font-semibold">{Number(rule.defaultFee).toFixed(2)}</td>
                      <td className="px-4 py-4">
                        <span className={rule.isActive ? "rounded-lg bg-[#e6f3ef] px-2.5 py-1 text-xs font-semibold text-brand" : "rounded-lg bg-background px-2.5 py-1 text-xs font-semibold text-muted"}>
                          {rule.isActive ? "Active" : "Paused"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-muted">{formatDate(rule.updatedAt)}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <Link className="text-xs font-semibold text-brand hover:text-brand-strong" href={`/violation-rules/${rule.id}/edit`}>
                            Edit
                          </Link>
                          <form action={archiveViolationRuleAction.bind(null, rule.id)}>
                            <button className="text-xs font-semibold text-danger hover:underline" type="submit">
                              Archive
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-muted" colSpan={5}>
                      No violation rules yet. Create the first catalog entry to start applying apartment violations.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function StatusBanner({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-[#cfe5dc] bg-[#eef8f4] px-4 py-3 text-sm font-medium text-brand">
      {text}
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
