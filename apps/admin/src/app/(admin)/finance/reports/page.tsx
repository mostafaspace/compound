import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import {
  getCurrentUser,
  getFinancePaymentMethodBreakdown,
  getFinanceReportAccounts,
  getFinanceReportSummary,
} from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

type BalanceStatus = "all" | "positive" | "zero" | "credit";

interface ReportsPageProps {
  searchParams?: Promise<{
    balanceStatus?: string;
  }>;
}

function parseBalanceStatus(value?: string): BalanceStatus {
  if (value === "positive" || value === "zero" || value === "credit") return value;
  return "all";
}

function formatMoney(amount: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function balanceTone(balance: string): string {
  const n = Number(balance);
  if (n > 0) return "text-danger";
  if (n < 0) return "text-brand";
  return "text-muted";
}

export default async function FinanceReportsPage({ searchParams }: ReportsPageProps) {
  await requireAdminUser(getCurrentUser);
  const locale = await getLocale();
  const t = await getTranslations("Finance");
  const params = searchParams ? await searchParams : {};
  const activeFilter = parseBalanceStatus(params.balanceStatus);

  const [summary, accounts, paymentMethods] = await Promise.all([
    getFinanceReportSummary(),
    getFinanceReportAccounts({ balanceStatus: activeFilter }),
    getFinancePaymentMethodBreakdown(),
  ]);

  const filterHref = (status: BalanceStatus) =>
    `/finance/reports${status === "all" ? "" : `?balanceStatus=${status}`}`;

  const filterKeys: Array<{ key: BalanceStatus; label: string }> = [
    { key: "all", label: t("reports.accounts.filterAll") },
    { key: "positive", label: t("reports.accounts.filterPositive") },
    { key: "zero", label: t("reports.accounts.filterZero") },
    { key: "credit", label: t("reports.accounts.filterCredit") },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/finance">
              ← {t("reports.backToFinance")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("reports.title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{t("reports.subtitle")}</p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-8 px-5 py-6 lg:px-8">
        {/* Summary KPIs */}
        {summary ? (
          <div className="rounded-lg border border-line bg-panel p-5">
            <h2 className="text-lg font-semibold">{t("reports.summary.title")}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-line bg-background p-4">
                <p className="text-xs font-semibold text-muted">{t("reports.summary.totalBilled")}</p>
                <p className="mt-1 text-2xl font-bold">{formatMoney(summary.totalBilled, locale)}</p>
              </div>
              <div className="rounded-lg border border-line bg-background p-4">
                <p className="text-xs font-semibold text-muted">{t("reports.summary.totalCollected")}</p>
                <p className="mt-1 text-2xl font-bold text-brand">{formatMoney(summary.totalCollected, locale)}</p>
              </div>
              <div className="rounded-lg border border-line bg-background p-4">
                <p className="text-xs font-semibold text-muted">{t("reports.summary.totalOutstanding")}</p>
                <p className="mt-1 text-2xl font-bold text-danger">{formatMoney(summary.totalOutstanding, locale)}</p>
              </div>
              <div className="rounded-lg border border-line bg-background p-4">
                <p className="text-xs font-semibold text-muted">{t("reports.summary.totalCredit")}</p>
                <p className="mt-1 text-2xl font-bold">{formatMoney(summary.totalCredit, locale)}</p>
              </div>
              <div className="rounded-lg border border-line bg-background p-4">
                <p className="text-xs font-semibold text-muted">{t("reports.summary.collectionRate")}</p>
                <p className="mt-1 text-2xl font-bold">{summary.collectionRate}%</p>
              </div>
              <div className="rounded-lg border border-line bg-background p-4">
                <p className="text-xs font-semibold text-muted">{t("reports.summary.unpaidUnits")}</p>
                <p className="mt-1 text-2xl font-bold text-danger">{summary.unpaidUnitsCount}</p>
              </div>
              <div className="rounded-lg border border-line bg-background p-4">
                <p className="text-xs font-semibold text-muted">{t("reports.summary.totalAccounts")}</p>
                <p className="mt-1 text-2xl font-bold">{summary.totalAccountsCount}</p>
              </div>
              <div className="rounded-lg border border-line bg-background p-4">
                <p className="text-xs font-semibold text-muted">{t("reports.summary.pendingPayments")}</p>
                <p className="mt-1 text-2xl font-bold">{summary.pendingPaymentsCount}</p>
                <p className="text-xs text-muted">{formatMoney(summary.pendingPaymentsAmount, locale)}</p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Account balances */}
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold">{t("reports.accounts.title")}</h2>

          {/* Filter pills */}
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t("reports.accounts.title")}>
            {filterKeys.map(({ key, label }) => (
              <Link
                key={key}
                href={filterHref(key)}
                className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold transition-colors ${
                  activeFilter === key
                    ? "bg-brand text-white"
                    : "border border-line bg-background text-foreground hover:border-brand"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {accounts.length === 0 ? (
            <p className="mt-4 text-sm text-muted">{t("reports.accounts.empty")}</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-start">
                    <th className="pb-2 pe-4 text-xs font-semibold text-muted">{t("reports.accounts.unit")}</th>
                    <th className="pb-2 pe-4 text-xs font-semibold text-muted">{t("reports.accounts.building")}</th>
                    <th className="pb-2 pe-4 text-end text-xs font-semibold text-muted">{t("reports.accounts.balance")}</th>
                    <th className="pb-2 text-xs font-semibold text-muted">{t("reports.accounts.currency")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {accounts.map((account) => (
                    <tr key={account.id}>
                      <td className="py-2 pe-4 font-medium">
                        {(account as { unit?: { unitNumber?: string } }).unit?.unitNumber ?? t("accounts.unitUnavailable")}
                      </td>
                      <td className="py-2 pe-4 text-muted">
                        {(account as { unit?: { building?: { name?: string } } }).unit?.building?.name ?? "—"}
                      </td>
                      <td className={`py-2 pe-4 text-end font-semibold tabular-nums ${balanceTone(account.balance)}`}>
                        {formatMoney(account.balance, locale)}
                      </td>
                      <td className="py-2 text-muted">{account.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment method breakdown */}
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold">{t("reports.paymentMethods.title")}</h2>
          <p className="mt-1 text-sm text-muted">{t("reports.paymentMethods.subtitle")}</p>

          {paymentMethods.length === 0 ? (
            <p className="mt-4 text-sm text-muted">{t("reports.paymentMethods.empty")}</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-start">
                    <th className="pb-2 pe-4 text-xs font-semibold text-muted">{t("reports.paymentMethods.method")}</th>
                    <th className="pb-2 pe-4 text-end text-xs font-semibold text-muted">{t("reports.paymentMethods.count")}</th>
                    <th className="pb-2 text-end text-xs font-semibold text-muted">{t("reports.paymentMethods.total")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paymentMethods.map((row) => (
                    <tr key={row.method}>
                      <td className="py-2 pe-4 font-medium capitalize">{row.method.replace(/_/g, " ")}</td>
                      <td className="py-2 pe-4 text-end tabular-nums">{row.count}</td>
                      <td className="py-2 text-end font-semibold tabular-nums">{formatMoney(row.total, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
