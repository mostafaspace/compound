import type { LedgerEntryType, PaymentStatus } from "@compound/contracts";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import {
  getCurrentUser,
  getFinancePaymentSubmissions,
  getFinanceUnitAccounts,
} from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import {
  approveFinancePaymentAction,
  createFinanceLedgerEntryAction,
  createFinanceUnitAccountAction,
  rejectFinancePaymentAction,
} from "./actions";

interface FinancePageProps {
  searchParams?: Promise<{
    accountCreated?: string;
    ledgerCreated?: string;
    paymentApproved?: string;
    paymentRejected?: string;
    status?: string;
  }>;
}

const ledgerTypes: Array<Exclude<LedgerEntryType, "payment">> = [
  "opening_balance",
  "charge",
  "penalty",
  "allocation",
  "adjustment",
  "refund",
  "write_off",
];

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

function toneForBalance(balance: string): string {
  const value = Number(balance);

  if (value > 0) return "text-danger";
  if (value < 0) return "text-brand";
  return "text-muted";
}

export default async function FinancePage({ searchParams }: FinancePageProps) {
  await requireAdminUser(getCurrentUser);
  const locale = await getLocale();
  const t = await getTranslations("Finance");
  const params = searchParams ? await searchParams : {};
  const activeStatus = parsePaymentStatus(params.status);
  const [accounts, payments] = await Promise.all([
    getFinanceUnitAccounts(),
    getFinancePaymentSubmissions({ status: activeStatus }),
  ]);

  const paymentFilterHref = (status: PaymentStatus | "all") => `/finance${status === "all" ? "" : `?status=${status}`}`;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/">
              {t("back")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-5 px-5 py-6 lg:px-8">
        {params.accountCreated ? <StatusBanner text={t("messages.accountCreated")} /> : null}
        {params.ledgerCreated ? <StatusBanner text={t("messages.ledgerCreated")} /> : null}
        {params.paymentApproved ? <StatusBanner text={t("messages.paymentApproved")} /> : null}
        {params.paymentRejected ? <StatusBanner text={t("messages.paymentRejected")} /> : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <form action={createFinanceUnitAccountAction} className="rounded-lg border border-line bg-panel p-5">
            <h2 className="text-lg font-semibold">{t("createAccount.title")}</h2>
            <p className="mt-1 text-sm text-muted">{t("createAccount.subtitle")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-muted">
                {t("fields.unitId")}
                <input className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" name="unitId" required />
              </label>
              <label className="text-xs font-semibold text-muted">
                {t("fields.currency")}
                <input className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" defaultValue="EGP" name="currency" required />
              </label>
              <label className="text-xs font-semibold text-muted">
                {t("fields.openingBalance")}
                <input className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" name="openingBalance" step="0.01" type="number" />
              </label>
              <label className="text-xs font-semibold text-muted">
                {t("fields.description")}
                <input className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" name="description" />
              </label>
            </div>
            <button className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" type="submit">
              {t("createAccount.submit")}
            </button>
          </form>

          <form action={createFinanceLedgerEntryAction} className="rounded-lg border border-line bg-panel p-5">
            <h2 className="text-lg font-semibold">{t("ledger.title")}</h2>
            <p className="mt-1 text-sm text-muted">{t("ledger.subtitle")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-muted">
                {t("fields.accountId")}
                <input className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" name="unitAccountId" required />
              </label>
              <label className="text-xs font-semibold text-muted">
                {t("fields.type")}
                <select className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" name="type">
                  {ledgerTypes.map((type) => (
                    <option key={type} value={type}>
                      {t(`ledgerTypes.${type}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-muted">
                {t("fields.amount")}
                <input className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" name="amount" required step="0.01" type="number" />
              </label>
              <label className="text-xs font-semibold text-muted">
                {t("fields.description")}
                <input className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" name="description" required />
              </label>
            </div>
            <button className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" type="submit">
              {t("ledger.submit")}
            </button>
          </form>
        </div>

        <section className="rounded-lg border border-line bg-panel">
          <div className="flex flex-col gap-3 border-b border-line p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t("accounts.title")}</h2>
              <p className="mt-1 text-sm text-muted">{t("accounts.subtitle")}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-sm">
              <thead className="bg-background text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">{t("fields.accountId")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("fields.unit")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("fields.balance")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("fields.currency")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t("fields.created")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {accounts.length > 0 ? (
                  accounts.map((account) => (
                    <tr key={account.id}>
                      <td className="px-4 py-4 font-mono text-xs">{account.id}</td>
                      <td className="px-4 py-4">{account.unitId}</td>
                      <td className={`px-4 py-4 font-semibold ${toneForBalance(account.balance)}`}>
                        {formatMoney(account.balance, account.currency, locale)}
                      </td>
                      <td className="px-4 py-4">{account.currency}</td>
                      <td className="px-4 py-4 text-muted">{formatDate(account.createdAt, locale)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-muted" colSpan={5}>
                      {t("accounts.empty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-panel">
          <div className="border-b border-line p-5">
            <h2 className="text-lg font-semibold">{t("payments.title")}</h2>
            <p className="mt-1 text-sm text-muted">{t("payments.subtitle")}</p>
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

          <div className="divide-y divide-line">
            {payments.length > 0 ? (
              payments.map((payment) => (
                <article className="grid gap-4 p-5 lg:grid-cols-[1fr_18rem]" key={payment.id}>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-lg bg-background px-2.5 py-1 text-xs font-semibold">{t(`paymentStatuses.${payment.status}`)}</span>
                      <span className="text-sm font-semibold">{formatMoney(payment.amount, payment.currency, locale)}</span>
                      <span className="text-xs text-muted">{payment.method}</span>
                      {payment.hasProof ? <span className="text-xs font-semibold text-brand">{t("payments.hasProof")}</span> : null}
                    </div>
                    <p className="mt-2 font-mono text-xs text-muted">{payment.id}</p>
                    <p className="mt-2 text-sm text-muted">
                      {t("fields.accountId")}: {payment.unitAccountId}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {t("fields.reference")}: {payment.reference || "-"}
                    </p>
                  </div>

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
                    </div>
                  ) : (
                    <div className="text-sm text-muted">{t("payments.reviewed", { date: formatDate(payment.reviewedAt, locale) })}</div>
                  )}
                </article>
              ))
            ) : (
              <div className="p-6 text-sm text-muted">{t("payments.empty")}</div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function StatusBanner({ text }: { text: string }) {
  return <p className="rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">{text}</p>;
}
