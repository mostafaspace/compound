import type { PaymentStatus } from "@compound/contracts";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { AdminPagination } from "@/components/admin-pagination";
import { SiteNav } from "@/components/site-nav";
import {
  getCurrentUser,
  getBuilding,
  getCollectionCampaigns,
  getCompound,
  getCompounds,
  getFinancePaymentSubmissionsPage,
  getFinanceUnitAccounts,
  getSystemStatus,
} from "@/lib/api";
import { getCompoundContext, requireAdminUser } from "@/lib/session";

import {
  approveFinancePaymentAction,
  archiveContributionCampaignAction,
  createContributionCampaignAction,
  rejectFinancePaymentAction,
  requestCorrectionPaymentAction,
} from "./actions";
import { FinanceContributionForms } from "./finance-contribution-forms";

interface FinancePageProps {
  searchParams?: Promise<{
    accountCreated?: string;
    ledgerCreated?: string;
    paymentApproved?: string;
    paymentRejected?: string;
    correctionRequested?: string;
    campaignArchived?: string;
    page?: string;
    status?: string;
    tab?: string;
  }>;
}

type FinanceTab = "submissions" | "campaigns" | "create";

const paymentStatuses: Array<PaymentStatus | "all"> = [
  "all",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "allocated",
  "refunded",
];

function parsePaymentStatus(value?: string): PaymentStatus | "all" {
  return paymentStatuses.includes(value as PaymentStatus | "all") ? (value as PaymentStatus | "all") : "submitted";
}

function parseFinanceTab(value?: string): FinanceTab {
  return value === "campaigns" || value === "create" || value === "submissions" ? value : "submissions";
}

function formatMoney(amount: string, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    currency,
    style: "currency",
  }).format(Number(amount));
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return "-";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function campaignStatusClasses(status: string): string {
  if (status === "active") return "bg-[#e6f3ef] text-brand";
  if (status === "draft") return "bg-background text-muted";
  if (status === "archived") return "bg-[#f3f4f6] text-muted";
  return "bg-[#fff8e8] text-[#7a5d1a]";
}

function unitLabel(unitAccountOrUnit: any): string {
  const unit = unitAccountOrUnit?.unit ?? unitAccountOrUnit;

  if (!unit) return "-";

  return [
    unit.unitNumber,
    unit.building?.name,
    unit.floor?.label,
    unit.residentName ? `Resident: ${unit.residentName}` : null,
  ].filter(Boolean).join(" · ");
}

function paymentResidentLabel(payment: any): string {
  const residents = payment.unitAccount?.unit?.apartmentResidents ?? [];
  const primaryResident = residents.find((resident: any) => resident.isPrimary) ?? residents[0];

  return primaryResident?.user?.name ?? payment.submitter?.name ?? "-";
}

function paymentProofHref(paymentId: string): string {
  return `/finance/payment-submissions/${paymentId}/proof`;
}

function campaignAudienceLabel(
  campaign: { targetType?: "compound" | "building" | "floor"; targetIds?: string[] | null },
  buildings: Array<{ id: string; name: string; floors?: Array<{ id: string; label: string }> }>,
  labels: {
    compound: string;
    selectedBuildings: string;
    selectedFloors: string;
  },
): string {
  if (!campaign.targetType || campaign.targetType === "compound") {
    return labels.compound;
  }

  const targetIds = campaign.targetIds ?? [];

  if (campaign.targetType === "building") {
    const names = buildings.filter((building) => targetIds.includes(building.id)).map((building) => building.name);
    return names.length > 0 ? names.join(", ") : labels.selectedBuildings;
  }

  const floors = buildings.flatMap((building) =>
    (building.floors ?? [])
      .filter((floor) => targetIds.includes(floor.id))
      .map((floor) => `${building.name} · ${floor.label}`),
  );

  return floors.length > 0 ? floors.join(", ") : labels.selectedFloors;
}

export default async function FinancePage({ searchParams }: FinancePageProps) {
  const currentUser = await requireAdminUser(getCurrentUser);
  const locale = await getLocale();
  const t = await getTranslations("Finance");
  const commonT = await getTranslations("Common");
  const params = searchParams ? await searchParams : {};
  const activeTab = parseFinanceTab(params.tab);
  const activeStatus = parsePaymentStatus(params.status);
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const scopedCompoundId = (await getCompoundContext()) ?? currentUser.compoundId;
  const [accounts, paymentsPage, systemStatus, compounds] = await Promise.all([
    getFinanceUnitAccounts(),
    getFinancePaymentSubmissionsPage({ page, status: activeStatus }),
    getSystemStatus(),
    scopedCompoundId ? Promise.resolve([]) : getCompounds(),
  ]);
  const payments = paymentsPage.data;
  const activeCompoundId = scopedCompoundId ?? compounds[0]?.id ?? "";
  const [activeCompound, campaigns] = await Promise.all([
    activeCompoundId ? getCompound(activeCompoundId) : Promise.resolve(null),
    getCollectionCampaigns(activeCompoundId ? { compound_id: activeCompoundId } : {}),
  ]);
  const buildings = (
    await Promise.all((activeCompound?.buildings ?? []).map((building) => getBuilding(building.id)))
  ).filter((building): building is NonNullable<typeof building> => building !== null);
  const isDegraded = systemStatus?.status !== "ok";
  const showDegradedWarning = isDegraded && accounts.length === 0 && payments.length === 0;

  const paymentFilterHref = (status: PaymentStatus | "all") => `/finance?tab=submissions${status === "all" ? "" : `&status=${status}`}`;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[{ label: t("title") }]} />
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/">
              {t("back")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
              href="/finance?tab=create"
            >
              {t("tabs.create")}
            </Link>
            <Link
              className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand"
              href="/finance/payments/online"
            >
              {t("onlinePayments")}
            </Link>
            <Link
              className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm font-semibold hover:border-brand"
              href="/finance/reports"
            >
              {t("reports.title")}
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-5 px-5 py-6 lg:px-8">
        {params.accountCreated ? <StatusBanner text={t("messages.accountCreated")} /> : null}
        {params.ledgerCreated ? <StatusBanner text={t("messages.ledgerCreated")} /> : null}
        {params.paymentApproved ? <StatusBanner text={t("messages.paymentApproved")} /> : null}
        {params.paymentRejected ? <StatusBanner text={t("messages.paymentRejected")} /> : null}
        {params.correctionRequested ? <StatusBanner text={t("messages.correctionRequested")} /> : null}
        {params.campaignArchived ? <StatusBanner text={t("messages.campaignArchived")} /> : null}

        {showDegradedWarning ? (
          <div className="rounded-lg border border-[#e7d7a9] bg-[#fff8e8] px-4 py-3 text-sm text-[#7a5d1a]">
            <p className="font-semibold">{t("degraded.title")}</p>
            <p className="mt-1">{t("degraded.description")}</p>
          </div>
        ) : null}

        <FinanceTabs
          activeTab={activeTab}
          labels={{
            campaigns: t("tabs.campaigns"),
            create: t("tabs.create"),
            submissions: t("tabs.submissions"),
          }}
          metrics={{
            campaigns: campaigns.length,
            submissions: paymentsPage.meta.total,
          }}
        />

        {activeTab === "create" ? (
          <FinanceContributionForms
            buildings={buildings}
            createContributionAction={createContributionCampaignAction}
            labels={{
              amount: t("fields.amount"),
              buildings: t("audience.buildings"),
              buildingsHelp: t("audience.buildingsHelp"),
              compound: t("audience.compound"),
              compoundHelp: t("audience.compoundHelp"),
              description: t("fields.description"),
              floors: t("audience.floors"),
              floorsHelp: t("audience.floorsHelp"),
              noBuildings: t("audience.noBuildings"),
              noFloors: t("audience.noFloors"),
              noMatches: t("common.noMatches"),
              noneSelected: t("common.noneSelected"),
              recipientDescription: t("audience.description"),
              recipientTitle: t("audience.title"),
              searchAudience: t("audience.search"),
              selected: t("common.selected"),
              submitContribution: t("ledger.submit"),
              contributionSubtitle: t("ledger.subtitle"),
              contributionTitle: t("ledger.title"),
            }}
          />
        ) : null}

        {activeTab === "campaigns" ? (
          <section className="rounded-lg border border-line bg-panel">
          <div className="flex flex-col gap-3 border-b border-line p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t("campaigns.title")}</h2>
              <p className="mt-1 text-sm text-muted">{t("campaigns.subtitle")}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead className="bg-background text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">{t("campaigns.name")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("campaigns.audience")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("fields.amount")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("campaigns.status")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("campaigns.started")}</th>
                  <th className="px-4 py-3 text-start font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {campaigns.length > 0 ? (
                  campaigns.map((campaign) => (
                    <tr className="hover:bg-background/60" key={campaign.id}>
                      <td className="px-4 py-4">
                        <p className="font-semibold">{campaign.name}</p>
                        {campaign.description ? <p className="mt-1 text-xs text-muted">{campaign.description}</p> : null}
                      </td>
                      <td className="max-w-[22rem] px-4 py-4 text-muted">
                        {campaignAudienceLabel(campaign, buildings, {
                          compound: t("audience.compound"),
                          selectedBuildings: t("campaigns.selectedBuildings"),
                          selectedFloors: t("campaigns.selectedFloors"),
                        })}
                      </td>
                      <td className="px-4 py-4 font-semibold">
                        {campaign.targetAmount ? formatMoney(String(campaign.targetAmount), campaign.currency ?? "EGP", locale) : "-"}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${campaignStatusClasses(campaign.status)}`}>
                          {t(`campaignStatuses.${campaign.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-muted">{formatDate(campaign.startedAt, locale)}</td>
                      <td className="px-4 py-4">
                        {campaign.status === "active" ? (
                          <form action={archiveContributionCampaignAction.bind(null, campaign.id)}>
                            <button className="text-xs font-semibold text-danger hover:underline" type="submit">
                              {t("campaigns.archive")}
                            </button>
                          </form>
                        ) : null}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-muted" colSpan={6}>
                      {t("campaigns.empty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </section>
        ) : null}

        {activeTab === "submissions" ? (
          <section className="rounded-lg border border-line bg-panel">
          <div className="border-b border-line p-5">
            <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">{t("payments.title")}</h2>
                <p className="mt-1 text-sm text-muted">{t("payments.subtitle")}</p>
              </div>
              <p className="text-sm text-muted">
                {commonT("pagination.summary", {
                  from: paymentsPage.meta.from ?? 0,
                  to: paymentsPage.meta.to ?? 0,
                  total: paymentsPage.meta.total,
                })}
              </p>
            </div>
            <nav className="mt-4 flex flex-wrap gap-2" aria-label={t("payments.filters")}>
              {paymentStatuses.map((status) => (
                <Link
                  className={`inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold ${
                    activeStatus === status ? "border-brand bg-[#e6f3ef] text-brand" : "border-line text-muted hover:border-brand hover:text-foreground"
                  }`}
                  href={paymentFilterHref(status)}
                  key={status}
                >
                  {status === "all" ? t("filters.all") : t(`paymentStatuses.${status}`)}
                </Link>
              ))}
            </nav>
          </div>

          <div className="overflow-x-auto">
            {payments.length > 0 ? (
              <table className="w-full min-w-[1180px] border-collapse text-sm">
                <thead className="bg-background text-muted">
                  <tr>
                    <th className="px-4 py-3 text-start font-semibold">{t("payments.columns.status")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("fields.unit")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("payments.columns.resident")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("fields.amount")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("payments.columns.methodReference")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("payments.columns.proof")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("payments.columns.submitted")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("payments.columns.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {payments.map((payment) => (
                    <tr className="align-top hover:bg-background/60" key={payment.id}>
                      <td className="px-4 py-4">
                        <span className="rounded-lg bg-background px-2.5 py-1 text-xs font-semibold">{t(`paymentStatuses.${payment.status}`)}</span>
                        {payment.status === "under_review" && payment.correctionNote ? (
                          <p className="mt-2 max-w-[14rem] rounded-lg bg-background px-3 py-2 text-xs text-muted">
                            <span className="font-semibold">{t("payments.correctionNoteLabel")}</span> {payment.correctionNote}
                          </p>
                        ) : null}
                        {payment.status === "rejected" && payment.rejectionReason ? (
                          <p className="mt-2 max-w-[14rem] rounded-lg bg-[#fff3f2] px-3 py-2 text-xs text-danger">
                            <span className="font-semibold">{t("payments.rejectionReasonLabel")}</span> {payment.rejectionReason}
                          </p>
                        ) : null}
                      </td>
                      <td className="max-w-[18rem] px-4 py-4 font-semibold">{unitLabel(payment.unitAccount ?? {})}</td>
                      <td className="px-4 py-4 text-muted">{paymentResidentLabel(payment)}</td>
                      <td className="px-4 py-4 font-semibold">{formatMoney(payment.amount, payment.currency, locale)}</td>
                      <td className="px-4 py-4">
                        <p className="font-semibold">{payment.method}</p>
                        <p className="mt-1 text-xs text-muted">
                          {t("fields.reference")}: {payment.reference || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        {payment.hasProof ? (
                          <Link
                            className="inline-flex h-9 items-center rounded-lg border border-brand px-3 text-xs font-semibold text-brand hover:bg-[#e6f3ef]"
                            href={paymentProofHref(payment.id)}
                            target="_blank"
                          >
                            {t("payments.viewProof")}
                          </Link>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-muted">
                        {payment.paymentDate ? <p>{payment.paymentDate}</p> : null}
                        <p>{formatDate(payment.createdAt, locale)}</p>
                      </td>
                      <td className="w-[18rem] px-4 py-4">
                        {payment.status === "submitted" || payment.status === "under_review" ? (
                          <div className="grid gap-3">
                            <form action={approveFinancePaymentAction.bind(null, payment.id)} className="space-y-2">
                              <input className="h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" name="description" placeholder={t("payments.approveNote")} />
                              <button className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" type="submit">
                                {t("payments.approve")}
                              </button>
                            </form>
                            <form action={rejectFinancePaymentAction.bind(null, payment.id)} className="space-y-2">
                              <input className="h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" name="reason" placeholder={t("payments.rejectReason")} required />
                              <button className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-danger px-4 text-sm font-semibold text-danger hover:bg-[#fff3f2]" type="submit">
                                {t("payments.reject")}
                              </button>
                            </form>
                            <form action={requestCorrectionPaymentAction.bind(null, payment.id)} className="space-y-2">
                              <input className="h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" name="note" placeholder={t("payments.correctionNote")} required />
                              <button className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-line px-4 text-sm font-semibold text-muted hover:border-foreground hover:text-foreground" type="submit">
                                {t("payments.requestCorrection")}
                              </button>
                            </form>
                          </div>
                        ) : (
                          <div className="text-sm text-muted">{t("payments.reviewed", { date: formatDate(payment.reviewedAt, locale) })}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-sm text-muted">{t("payments.empty")}</div>
            )}
          </div>
          <AdminPagination
            basePath="/finance"
            labels={{
              first: commonT("pagination.first"),
              last: commonT("pagination.last"),
              next: commonT("pagination.next"),
              previous: commonT("pagination.previous"),
              summary: commonT("pagination.summary", {
                from: paymentsPage.meta.from ?? 0,
                to: paymentsPage.meta.to ?? 0,
                total: paymentsPage.meta.total,
              }),
            }}
            meta={paymentsPage.meta}
            params={{ status: activeStatus !== "all" ? activeStatus : undefined, tab: "submissions" }}
          />
          </section>
        ) : null}
      </section>
    </main>
  );
}

function FinanceTabs({
  activeTab,
  labels,
  metrics,
}: {
  activeTab: FinanceTab;
  labels: Record<FinanceTab, string>;
  metrics: { campaigns: number; submissions: number };
}) {
  const tabs: Array<{ href: string; key: FinanceTab; metric?: number }> = [
    { href: "/finance?tab=submissions", key: "submissions", metric: metrics.submissions },
    { href: "/finance?tab=campaigns", key: "campaigns", metric: metrics.campaigns },
    { href: "/finance?tab=create", key: "create" },
  ];

  return (
    <nav aria-label="Contribution workspace sections" className="flex flex-wrap gap-2 rounded-lg border border-line bg-panel p-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <Link
            className={`inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${
              isActive ? "bg-brand text-white shadow-sm" : "text-muted hover:bg-background hover:text-foreground"
            }`}
            href={tab.href}
            key={tab.key}
          >
            <span>{labels[tab.key]}</span>
            {typeof tab.metric === "number" ? (
              <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? "bg-white/20 text-white" : "bg-background text-muted"}`}>
                {tab.metric}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function StatusBanner({ text }: { text: string }) {
  return <p className="rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">{text}</p>;
}
