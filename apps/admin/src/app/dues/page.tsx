import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import {
  getCurrentUser,
  getChargeTypes,
  getRecurringCharges,
  getCollectionCampaigns,
} from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import {
  createChargeTypeAction,
  createRecurringChargeAction,
  createCampaignAction,
  deactivateRecurringChargeAction,
  publishCampaignAction,
  archiveCampaignAction,
} from "./actions";

interface DuesPageProps {
  searchParams?: Promise<{
    chargeTypeCreated?: string;
    recurringChargeCreated?: string;
    recurringChargeDeactivated?: string;
    campaignCreated?: string;
    campaignPublished?: string;
    campaignArchived?: string;
    chargesApplied?: string;
  }>;
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
}

function campaignStatusClasses(status: string): string {
  switch (status) {
    case "active":
      return "bg-[#e6f3ef] text-brand";
    case "draft":
      return "bg-background text-muted";
    case "closed":
      return "bg-[#fef9c3] text-yellow-700";
    case "archived":
      return "bg-[#fef2f2] text-danger";
    default:
      return "bg-background text-muted";
  }
}

export default async function DuesPage({ searchParams }: DuesPageProps) {
  await requireAdminUser(getCurrentUser);
  const locale = await getLocale();
  const t = await getTranslations("Dues");
  const params = searchParams ? await searchParams : {};

  const [chargeTypes, recurringCharges, campaigns] = await Promise.all([
    getChargeTypes(),
    getRecurringCharges(),
    getCollectionCampaigns(),
  ]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/">
              {t("backToDues")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("title")}</h1>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-8 px-5 py-6 lg:px-8">
        {params.chargeTypeCreated ? <StatusBanner text={t("chargeTypeCreated")} /> : null}
        {params.recurringChargeCreated ? <StatusBanner text={t("recurringChargeCreated")} /> : null}
        {params.recurringChargeDeactivated ? <StatusBanner text={t("deactivate")} /> : null}
        {params.campaignCreated ? <StatusBanner text={t("campaignCreated")} /> : null}
        {params.campaignPublished ? <StatusBanner text={t("campaignPublished")} /> : null}
        {params.campaignArchived ? <StatusBanner text={t("campaignArchived")} /> : null}
        {params.chargesApplied ? <StatusBanner text={t("chargesApplied")} /> : null}

        {/* Section 1: Charge Types */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{t("chargeTypes")}</h2>

          <div className="rounded-lg border border-line bg-panel">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead className="bg-background text-muted">
                  <tr>
                    <th className="px-4 py-3 text-start font-semibold">{t("name")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("code")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("defaultAmount")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("isRecurring")}</th>
                    <th className="px-4 py-3 text-start font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {chargeTypes.length > 0 ? (
                    chargeTypes.map((ct) => (
                      <tr className="hover:bg-background/60" key={ct.id}>
                        <td className="px-4 py-3 font-medium">{ct.name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{ct.code}</td>
                        <td className="px-4 py-3 text-muted">{ct.defaultAmount ?? "-"}</td>
                        <td className="px-4 py-3">
                          {ct.isRecurring ? (
                            <span className="rounded-lg bg-[#e6f3ef] px-2 py-0.5 text-xs font-semibold text-brand">
                              {t("isRecurring")}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            className="text-xs font-semibold text-brand hover:text-brand-strong"
                            href={`/dues/charge-types/${ct.id}/edit`}
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-6 text-muted" colSpan={5}>
                        {t("noDues")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <form action={createChargeTypeAction} className="rounded-lg border border-line bg-panel p-5">
            <h3 className="text-base font-semibold">{t("createChargeType")}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-semibold text-muted">
                {t("name")}
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                  name="name"
                  required
                />
              </label>
              <label className="text-xs font-semibold text-muted">
                {t("code")}
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm font-mono"
                  name="code"
                  required
                />
              </label>
              <label className="text-xs font-semibold text-muted">
                {t("defaultAmount")}
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                  name="default_amount"
                  step="0.01"
                  type="number"
                />
              </label>
              <label className="flex items-center gap-2 pt-5 text-xs font-semibold text-muted">
                <input className="h-4 w-4 rounded border border-line" name="is_recurring" type="checkbox" />
                {t("isRecurring")}
              </label>
            </div>
            <button
              className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
              type="submit"
            >
              {t("createChargeType")}
            </button>
          </form>
        </section>

        {/* Section 2: Recurring Charges */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{t("recurringCharges")}</h2>

          <div className="rounded-lg border border-line bg-panel">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] border-collapse text-sm">
                <thead className="bg-background text-muted">
                  <tr>
                    <th className="px-4 py-3 text-start font-semibold">{t("name")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("frequency")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("amount")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("targetType")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("isRecurring")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("lastRun")}</th>
                    <th className="px-4 py-3 text-start font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recurringCharges.length > 0 ? (
                    recurringCharges.map((rc) => (
                      <tr className="hover:bg-background/60" key={rc.id}>
                        <td className="px-4 py-3 font-medium">{rc.name}</td>
                        <td className="px-4 py-3 capitalize text-muted">{rc.frequency}</td>
                        <td className="px-4 py-3">
                          {rc.amount} {rc.currency}
                        </td>
                        <td className="px-4 py-3 capitalize text-muted">{rc.targetType}</td>
                        <td className="px-4 py-3">
                          {rc.isActive ? (
                            <span className="rounded-lg bg-[#e6f3ef] px-2 py-0.5 text-xs font-semibold text-brand">
                              {t("active")}
                            </span>
                          ) : (
                            <span className="rounded-lg bg-background px-2 py-0.5 text-xs text-muted">
                              {t("closed")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted">{formatDate(rc.lastRunAt, locale)}</td>
                        <td className="px-4 py-3">
                          {rc.isActive ? (
                            <form action={deactivateRecurringChargeAction.bind(null, rc.id)}>
                              <button
                                className="text-xs font-semibold text-danger hover:underline"
                                type="submit"
                              >
                                {t("deactivate")}
                              </button>
                            </form>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-6 text-muted" colSpan={7}>
                        {t("noRecurringCharges")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <form action={createRecurringChargeAction} className="rounded-lg border border-line bg-panel p-5">
            <h3 className="text-base font-semibold">{t("createRecurringCharge")}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-semibold text-muted">
                {t("name")}
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                  name="name"
                  required
                />
              </label>
              <label className="text-xs font-semibold text-muted">
                {t("amount")}
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                  name="amount"
                  required
                  step="0.01"
                  type="number"
                />
              </label>
              <label className="text-xs font-semibold text-muted">
                {t("frequency")}
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                  name="frequency"
                >
                  <option value="monthly">{t("monthly")}</option>
                  <option value="quarterly">{t("quarterly")}</option>
                  <option value="annual">{t("annual")}</option>
                  <option value="one_time">{t("oneTime")}</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-muted">
                {t("billingDay")}
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                  max={31}
                  min={1}
                  name="billing_day"
                  type="number"
                />
              </label>
              <label className="text-xs font-semibold text-muted">
                {t("targetType")}
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                  name="target_type"
                >
                  <option value="all">{t("all")}</option>
                  <option value="floor">{t("floor")}</option>
                  <option value="unit">{t("unit")}</option>
                </select>
              </label>
            </div>
            <button
              className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
              type="submit"
            >
              {t("createRecurringCharge")}
            </button>
          </form>
        </section>

        {/* Section 3: Collection Campaigns */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{t("campaigns")}</h2>

          <div className="rounded-lg border border-line bg-panel">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead className="bg-background text-muted">
                  <tr>
                    <th className="px-4 py-3 text-start font-semibold">{t("name")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("status")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("targetAmount")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("startedAt")}</th>
                    <th className="px-4 py-3 text-start font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {campaigns.length > 0 ? (
                    campaigns.map((campaign) => (
                      <tr className="hover:bg-background/60" key={campaign.id}>
                        <td className="px-4 py-3 font-medium">{campaign.name}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${campaignStatusClasses(campaign.status)}`}
                          >
                            {t(campaign.status as "draft" | "active" | "closed" | "archived")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted">{campaign.targetAmount ?? "-"}</td>
                        <td className="px-4 py-3 text-muted">{formatDate(campaign.startedAt, locale)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {campaign.status === "draft" ? (
                              <form action={publishCampaignAction.bind(null, campaign.id)}>
                                <button
                                  className="text-xs font-semibold text-brand hover:underline"
                                  type="submit"
                                >
                                  {t("publish")}
                                </button>
                              </form>
                            ) : null}
                            {campaign.status === "active" ? (
                              <>
                                <form action={archiveCampaignAction.bind(null, campaign.id)}>
                                  <button
                                    className="text-xs font-semibold text-danger hover:underline"
                                    type="submit"
                                  >
                                    {t("archive")}
                                  </button>
                                </form>
                                <Link
                                  className="text-xs font-semibold text-brand hover:text-brand-strong"
                                  href={`/dues/collection-campaigns/${campaign.id}/charges`}
                                >
                                  {t("applyCharges")}
                                </Link>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-6 text-muted" colSpan={5}>
                        {t("noCampaigns")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <form action={createCampaignAction} className="rounded-lg border border-line bg-panel p-5">
            <h3 className="text-base font-semibold">{t("createCampaign")}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-semibold text-muted">
                {t("name")}
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                  name="name"
                  required
                />
              </label>
              <label className="text-xs font-semibold text-muted">
                {t("targetAmount")}
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                  name="target_amount"
                  step="0.01"
                  type="number"
                />
              </label>
              <label className="text-xs font-semibold text-muted sm:col-span-2 lg:col-span-1">
                {t("description")}
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                  name="description"
                />
              </label>
            </div>
            <button
              className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
              type="submit"
            >
              {t("createCampaign")}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}

function StatusBanner({ text }: { text: string }) {
  return <p className="rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">{text}</p>;
}
