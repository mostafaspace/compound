import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SiteNav } from "@/components/site-nav";
import { getCurrentUser } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import { createCompoundAction } from "../actions";

export default async function NewCompoundPage() {
  await requireAdminUser(getCurrentUser);
  const t = await getTranslations("Registry");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[
        { label: t("propertyRegistry"), href: "/compounds" },
        { label: t("newCompoundTitle") },
      ]} />

      <header className="border-b border-line bg-panel">
        <div className="mx-auto max-w-4xl px-5 py-6 lg:px-8">
          <h1 className="text-3xl font-semibold">{t("newCompoundTitle")}</h1>
          <p className="mt-2 text-sm text-muted">{t("newCompoundDesc")}</p>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-6 lg:px-8">
        <form action={createCompoundAction} className="rounded-lg border border-line bg-panel p-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold">{t("compoundName")}</span>
              <input
                className="h-11 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                name="name"
                placeholder="Nile Gardens"
                required
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">{t("code")}</span>
              <input
                className="h-11 rounded-lg border border-line px-3 font-mono text-sm uppercase outline-none focus:border-brand"
                name="code"
                placeholder="NILE-GARDENS"
                required
              />
            </label>

            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-semibold">{t("legalName")}</span>
              <input
                className="h-11 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                name="legalName"
                placeholder="Nile Gardens Owners Association"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">{t("timezone")}</span>
              <select className="h-11 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand" name="timezone">
                <option value="Africa/Cairo">Africa/Cairo</option>
                <option value="UTC">UTC</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">{t("currency")}</span>
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
              {t("cancel")}
            </Link>
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
              type="submit"
            >
              {t("createCompound")}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
