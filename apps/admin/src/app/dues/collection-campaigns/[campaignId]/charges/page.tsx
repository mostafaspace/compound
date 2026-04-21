import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getCollectionCampaign } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import { applyCampaignChargesAction } from "@/app/dues/actions";

interface CampaignChargesPageProps {
  params: Promise<{ campaignId: string }>;
  searchParams?: Promise<{ success?: string }>;
}

export default async function CampaignChargesPage({ params, searchParams }: CampaignChargesPageProps) {
  await requireAdminUser(getCurrentUser);
  const t = await getTranslations("Dues");
  const { campaignId } = await params;
  const sp = searchParams ? await searchParams : {};
  const campaign = await getCollectionCampaign(campaignId);

  if (!campaign) {
    notFound();
  }

  const applyAction = applyCampaignChargesAction.bind(null, campaignId);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/dues">
              {t("backToDues")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("applyCharges")}</h1>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-2xl space-y-5 px-5 py-6 lg:px-8">
        {sp.success ? (
          <p className="rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">{t("chargesApplied")}</p>
        ) : null}

        {/* Campaign info */}
        <div className="rounded-lg border border-line bg-panel p-5">
          <p className="text-xs font-semibold uppercase text-muted">{t("campaigns")}</p>
          <p className="mt-1 text-lg font-semibold">{campaign.name}</p>
          {campaign.description ? <p className="mt-1 text-sm text-muted">{campaign.description}</p> : null}
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
            <span>
              {t("status")}:{" "}
              <span className="font-semibold text-foreground capitalize">{campaign.status}</span>
            </span>
            {campaign.targetAmount ? (
              <span>
                {t("targetAmount")}:{" "}
                <span className="font-semibold text-foreground">{campaign.targetAmount}</span>
              </span>
            ) : null}
          </div>
        </div>

        {/* Apply charges form */}
        <form action={applyAction} className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-base font-semibold">{t("applyCharges")}</h2>

          <div className="mt-4 space-y-4">
            <label className="block text-xs font-semibold text-muted">
              {t("unitAccountIds")}
              <textarea
                className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm font-mono"
                name="unit_account_ids"
                placeholder="account-id-1&#10;account-id-2&#10;account-id-3"
                required
                rows={5}
              />
              <span className="mt-1 block text-xs font-normal text-muted">
                One ID per line or comma-separated
              </span>
            </label>

            <label className="block text-xs font-semibold text-muted">
              {t("amount")}
              <input
                className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                name="amount"
                required
                step="0.01"
                type="number"
              />
            </label>

            <label className="block text-xs font-semibold text-muted">
              {t("description")}
              <input
                className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                name="description"
                required
              />
            </label>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
              type="submit"
            >
              {t("applyCharges")}
            </button>
            <Link
              className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm font-semibold text-muted hover:border-brand hover:text-foreground"
              href="/dues"
            >
              {t("backToDues")}
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
