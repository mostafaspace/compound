import Link from "next/link";

import { SiteNav } from "@/components/site-nav";
import { getCurrentUser } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import { createViolationRuleAction } from "../actions";

export default async function NewViolationRulePage() {
  await requireAdminUser(getCurrentUser);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[{ label: "Violation rules", href: "/violation-rules" }, { label: "New" }]} />

      <header className="border-b border-line bg-panel">
        <div className="mx-auto max-w-4xl px-5 py-6 lg:px-8">
          <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/violation-rules">
            Back to violation rules
          </Link>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">New violation rule</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Define a reusable catalog item with the default fee admins can apply to apartments.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-6 lg:px-8">
        <ViolationRuleForm action={createViolationRuleAction} submitLabel="Create rule" />
      </section>
    </main>
  );
}

function ViolationRuleForm({
  action,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
}) {
  return (
    <form action={action} className="rounded-lg border border-line bg-panel p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-xs font-semibold text-muted">
          Name
          <input className="mt-1 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm" name="name" required />
        </label>
        <label className="text-xs font-semibold text-muted">
          Arabic name
          <input className="mt-1 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm" name="name_ar" />
        </label>
        <label className="text-xs font-semibold text-muted">
          Default fee
          <input className="mt-1 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm" min="0" name="default_fee" step="0.01" type="number" />
        </label>
        <label className="flex items-center gap-2 pt-6 text-xs font-semibold text-muted">
          <input className="h-4 w-4 rounded border border-line" defaultChecked name="is_active" type="checkbox" />
          Active
        </label>
        <label className="text-xs font-semibold text-muted md:col-span-2">
          Description
          <textarea className="mt-1 min-h-32 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm" name="description" />
        </label>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button className="inline-flex h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" type="submit">
          {submitLabel}
        </button>
        <Link className="inline-flex h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand" href="/violation-rules">
          Cancel
        </Link>
      </div>
    </form>
  );
}
