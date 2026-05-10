import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteNav } from "@/components/site-nav";
import { getCurrentUser, listViolationRules } from "@/lib/api";
import { getCompoundContext, requireAdminUser } from "@/lib/session";

import { updateViolationRuleAction } from "../../actions";

interface EditViolationRulePageProps {
  params: Promise<{
    ruleId: string;
  }>;
}

export default async function EditViolationRulePage({ params }: EditViolationRulePageProps) {
  const user = await requireAdminUser(getCurrentUser);
  const { ruleId } = await params;
  const compoundId = (await getCompoundContext()) ?? user.compoundId;

  if (!compoundId) {
    notFound();
  }

  const rules = await listViolationRules(compoundId);
  const rule = rules.find((item) => item.id === Number(ruleId));

  if (!rule) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[{ label: "Violation rules", href: "/violation-rules" }, { label: rule.name }]} />

      <header className="border-b border-line bg-panel">
        <div className="mx-auto max-w-4xl px-5 py-6 lg:px-8">
          <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/violation-rules">
            Back to violation rules
          </Link>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Edit violation rule</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">Adjust rule labels, default fee, and active state.</p>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-6 lg:px-8">
        <form action={updateViolationRuleAction.bind(null, rule.id)} className="rounded-lg border border-line bg-panel p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-semibold text-muted">
              Name
              <input className="mt-1 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm" defaultValue={rule.name} name="name" required />
            </label>
            <label className="text-xs font-semibold text-muted">
              Arabic name
              <input className="mt-1 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm" defaultValue={rule.nameAr ?? ""} name="name_ar" />
            </label>
            <label className="text-xs font-semibold text-muted">
              Default fee
              <input className="mt-1 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm" defaultValue={rule.defaultFee} min="0" name="default_fee" step="0.01" type="number" />
            </label>
            <label className="flex items-center gap-2 pt-6 text-xs font-semibold text-muted">
              <input className="h-4 w-4 rounded border border-line" defaultChecked={rule.isActive} name="is_active" type="checkbox" />
              Active
            </label>
            <label className="text-xs font-semibold text-muted md:col-span-2">
              Description
              <textarea className="mt-1 min-h-32 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm" defaultValue={rule.description ?? ""} name="description" />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="inline-flex h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" type="submit">
              Save changes
            </button>
            <Link className="inline-flex h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand" href="/violation-rules">
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
