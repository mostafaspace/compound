import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { SiteNav } from "@/components/site-nav";
import { getCompound, getCurrentUser } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import { archiveCompoundAction, updateCompoundAction } from "../../actions";

interface EditCompoundPageProps {
  params: Promise<{ compoundId: string }>;
}

export default async function EditCompoundPage({ params }: EditCompoundPageProps) {
  await requireAdminUser(getCurrentUser);
  const { compoundId } = await params;
  const [compound, t] = await Promise.all([getCompound(compoundId), getTranslations("Registry")]);

  if (!compound) notFound();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[
        { label: t("propertyRegistry"), href: "/compounds" },
        { label: compound.name, href: `/compounds/${compound.id}` },
        { label: t("editCompound") },
      ]} />

      <header className="border-b border-line bg-panel">
        <div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
          <h1 className="text-3xl font-semibold">{t("editCompound")} — {compound.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">{t("editCompoundDesc")}</p>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[1fr_0.8fr] lg:px-8">
        <form action={updateCompoundAction.bind(null, compound.id)} className="rounded-lg border border-line bg-panel p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              {t("name")}
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="name" required defaultValue={compound.name} />
            </label>
            <label className="text-sm font-medium">
              {t("code")}
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3 font-mono" name="code" required defaultValue={compound.code} />
            </label>
            <label className="text-sm font-medium md:col-span-2">
              {t("legalName")}
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="legalName" defaultValue={compound.legalName ?? ""} />
            </label>
            <label className="text-sm font-medium">
              {t("timezone")}
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="timezone" required defaultValue={compound.timezone} />
            </label>
            <label className="text-sm font-medium">
              {t("currency")}
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3 uppercase" name="currency" required defaultValue={compound.currency} maxLength={3} />
            </label>
            <label className="text-sm font-medium">
              {t("status")}
              <select className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="status" defaultValue={compound.status}>
                <option value="draft">{t("draft")}</option>
                <option value="active">{t("active")}</option>
                <option value="suspended">{t("suspended")}</option>
                <option value="archived">{t("archived")}</option>
              </select>
            </label>
          </div>
          <button className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" type="submit">
            {t("saveChanges")}
          </button>
        </form>

        <form action={archiveCompoundAction.bind(null, compound.id)} className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold text-danger">{t("archiveCompound")}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{t("archiveCompoundDesc")}</p>
          <label className="mt-4 block text-sm font-medium">
            {t("reason")}
            <textarea className="mt-2 min-h-28 w-full rounded-lg border border-line px-3 py-2" name="reason" />
          </label>
          <button className="mt-4 inline-flex h-11 items-center justify-center rounded-lg border border-danger px-4 text-sm font-semibold text-danger" type="submit">
            {t("archive")}
          </button>
        </form>
      </section>
    </main>
  );
}
