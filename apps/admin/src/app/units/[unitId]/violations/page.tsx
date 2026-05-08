import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteNav } from "@/components/site-nav";
import {
  getCurrentUser,
  getUnit,
  listUnitViolations,
  listViolationRules,
  type ApartmentViolation,
} from "@/lib/api";
import { getCompoundContext, requireAdminUser } from "@/lib/session";

import {
  applyViolationAction,
  markViolationPaidAction,
  markViolationWaivedAction,
} from "./actions";

interface UnitViolationsPageProps {
  params: Promise<{ unitId: string }>;
  searchParams?: Promise<{ applied?: string; paid?: string; waived?: string }>;
}

export default async function UnitViolationsPage({ params, searchParams }: UnitViolationsPageProps) {
  const user = await requireAdminUser(getCurrentUser);
  const { unitId } = await params;
  const status = searchParams ? await searchParams : {};
  const unit = await getUnit(unitId);

  if (!unit) {
    notFound();
  }

  const compoundId = (await getCompoundContext()) ?? unit.compoundId ?? user.compoundId;
  const [violations, rules] = await Promise.all([
    listUnitViolations(unitId),
    compoundId ? listViolationRules(compoundId) : Promise.resolve([]),
  ]);
  const pendingTotal = violations
    .filter((violation) => violation.status === "pending")
    .reduce((sum, violation) => sum + Number(violation.fee), 0);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[{ label: "Unit", href: `/units/${unitId}` }, { label: "Violations" }]} />

      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href={`/units/${unitId}`}>
              Back to unit
            </Link>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Unit {unit.unitNumber} violations</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Apply catalog rules, record waivers, and track pending owner-liable balances.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-background px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Pending balance</div>
            <div className="mt-1 text-2xl font-semibold text-danger">{pendingTotal.toFixed(2)}</div>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="space-y-4">
          {status.applied ? <StatusBanner text="Violation applied." /> : null}
          {status.paid ? <StatusBanner text="Violation marked paid." /> : null}
          {status.waived ? <StatusBanner text="Violation waived." /> : null}

          <form action={applyViolationAction.bind(null, unitId)} className="rounded-lg border border-line bg-panel p-5">
            <h2 className="text-lg font-semibold">Apply violation</h2>
            <p className="mt-1 text-sm text-muted">Choose an active rule and optionally override the fee.</p>
            <div className="mt-4 grid gap-4">
              <label className="text-sm font-medium">
                Rule
                <select className="mt-2 h-11 w-full rounded-lg border border-line bg-background px-3" name="violation_rule_id" required>
                  <option value="">Select a rule</option>
                  {rules.filter((rule) => rule.isActive).map((rule) => (
                    <option key={rule.id} value={rule.id}>
                      {rule.name} · {Number(rule.defaultFee).toFixed(2)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Fee override
                <input className="mt-2 h-11 w-full rounded-lg border border-line bg-background px-3" min="0" name="fee" step="0.01" type="number" />
              </label>
              <label className="text-sm font-medium">
                Notes
                <textarea className="mt-2 min-h-28 w-full rounded-lg border border-line bg-background px-3 py-2" name="notes" />
              </label>
            </div>
            <button className="mt-5 inline-flex h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" type="submit">
              Apply violation
            </button>
          </form>
        </div>

        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-lg font-semibold">Violation history</h2>
            <p className="mt-1 text-sm text-muted">{violations.length} records for this unit.</p>
          </div>
          <div className="divide-y divide-line">
            {violations.length > 0 ? (
              violations.map((violation) => (
                <ViolationCard key={violation.id} unitId={unitId} violation={violation} />
              ))
            ) : (
              <p className="px-4 py-8 text-sm text-muted">No violations have been applied to this unit.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function ViolationCard({ unitId, violation }: { unitId: string; violation: ApartmentViolation }) {
  return (
    <article className="px-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="font-semibold">{violation.rule?.name ?? "Violation"}</h3>
          <p className="mt-1 text-sm text-muted">{formatDate(violation.createdAt)}</p>
          {violation.notes ? <p className="mt-2 text-sm leading-6 text-muted">{violation.notes}</p> : null}
          {violation.waivedReason ? <p className="mt-2 text-sm text-muted">Waived: {violation.waivedReason}</p> : null}
        </div>
        <div className="text-start md:text-end">
          <div className="text-lg font-semibold">{Number(violation.fee).toFixed(2)}</div>
          <span className={statusClass(violation.status)}>{violation.status}</span>
        </div>
      </div>
      {violation.status === "pending" ? (
        <div className="mt-4 grid gap-3 md:grid-cols-[auto_1fr]">
          <form action={markViolationPaidAction.bind(null, unitId, violation.id)}>
            <button className="inline-flex h-10 items-center rounded-lg border border-line px-3 text-sm font-semibold hover:border-brand" type="submit">
              Mark paid
            </button>
          </form>
          <form action={markViolationWaivedAction.bind(null, unitId, violation.id)} className="flex flex-col gap-2 sm:flex-row">
            <input className="h-10 flex-1 rounded-lg border border-line bg-background px-3 text-sm" name="reason" placeholder="Waiver reason" required />
            <button className="inline-flex h-10 items-center rounded-lg border border-line px-3 text-sm font-semibold text-danger hover:border-danger" type="submit">
              Waive
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

function StatusBanner({ text }: { text: string }) {
  return <div className="rounded-lg border border-[#cfe5dc] bg-[#eef8f4] px-4 py-3 text-sm font-medium text-brand">{text}</div>;
}

function statusClass(status: string): string {
  if (status === "paid") return "mt-2 inline-flex rounded-lg bg-[#e6f3ef] px-2.5 py-1 text-xs font-semibold text-brand";
  if (status === "waived") return "mt-2 inline-flex rounded-lg bg-[#eaf0ff] px-2.5 py-1 text-xs font-semibold text-[#244a8f]";
  return "mt-2 inline-flex rounded-lg bg-[#fff8e8] px-2.5 py-1 text-xs font-semibold text-[#7a5d1a]";
}

function formatDate(value: string | null): string {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
