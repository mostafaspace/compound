import Link from "next/link";
import { getTranslations } from "next-intl/server";

import {
  getCurrentUser,
  getGatewayTransactions,
  getPaymentSessions,
} from "@/lib/api";
import { requireAdminUser } from "@/lib/session";
import type { GatewayTransactionStatus, PaymentSessionStatus } from "@compound/contracts";

import { refundTransactionAction } from "./actions";

export default async function OnlinePaymentsPage() {
  await requireAdminUser(getCurrentUser);
  const t = await getTranslations("OnlinePayments");
  const nav = await getTranslations("Navigation");

  const [sessions, transactions] = await Promise.all([
    getPaymentSessions(),
    getGatewayTransactions(),
  ]);

  const sessionStatusColor: Record<PaymentSessionStatus, string> = {
    pending:   "bg-[#fff8e8] text-[#7a5d1a]",
    confirmed: "bg-[#e6f3ef] text-brand",
    failed:    "bg-[#fef2f2] text-danger",
    expired:   "bg-[#f3f4f6] text-muted",
    refunded:  "bg-[#f3f4f6] text-muted",
  };

  const txStatusColor: Record<GatewayTransactionStatus, string> = {
    confirmed: "bg-[#e6f3ef] text-brand",
    failed:    "bg-[#fef2f2] text-danger",
    refunded:  "bg-[#f3f4f6] text-muted",
    disputed:  "bg-[#fff8e8] text-[#7a5d1a]",
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/finance">
              {nav("finance")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("title")}</h1>
            <p className="mt-2 text-sm text-muted">{t("subtitle")}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-10 px-5 py-8 lg:px-8">

        {/* ── Payment Sessions ───────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">{t("sessions.title")}</h2>
          <div className="rounded-lg border border-line bg-panel overflow-hidden">
            {sessions.length === 0 ? (
              <p className="p-4 text-sm text-muted">{t("sessions.empty")}</p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead className="bg-background text-muted text-xs">
                  <tr>
                    <th className="px-4 py-2 text-start font-semibold">{t("fields.unit")}</th>
                    <th className="px-4 py-2 text-start font-semibold">{t("fields.provider")}</th>
                    <th className="px-4 py-2 text-start font-semibold">{t("fields.amount")}</th>
                    <th className="px-4 py-2 text-start font-semibold">{t("fields.status")}</th>
                    <th className="px-4 py-2 text-start font-semibold">{t("fields.created")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 text-xs text-muted">
                        {s.unitAccount?.unit?.unit_number ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">{s.provider}</td>
                      <td className="px-4 py-3 font-semibold">
                        {s.amount} {s.currency}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${sessionStatusColor[s.status]}`}>
                          {s.statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* ── Gateway Transactions ───────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">{t("transactions.title")}</h2>
          <div className="rounded-lg border border-line bg-panel overflow-hidden">
            {transactions.length === 0 ? (
              <p className="p-4 text-sm text-muted">{t("transactions.empty")}</p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead className="bg-background text-muted text-xs">
                  <tr>
                    <th className="px-4 py-2 text-start font-semibold">{t("fields.provider")}</th>
                    <th className="px-4 py-2 text-start font-semibold">{t("fields.transactionId")}</th>
                    <th className="px-4 py-2 text-start font-semibold">{t("fields.eventType")}</th>
                    <th className="px-4 py-2 text-start font-semibold">{t("fields.amount")}</th>
                    <th className="px-4 py-2 text-start font-semibold">{t("fields.status")}</th>
                    <th className="px-4 py-2 text-start font-semibold">{t("fields.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-4 py-3 text-xs font-mono">{tx.provider}</td>
                      <td className="px-4 py-3 text-xs text-muted font-mono truncate max-w-[160px]">
                        {tx.providerTransactionId}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">{tx.eventType}</td>
                      <td className="px-4 py-3 font-semibold">
                        {tx.amount} {tx.currency}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${txStatusColor[tx.status]}`}>
                          {tx.statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {tx.status === "confirmed" && (
                          <form action={refundTransactionAction.bind(null, tx.id)} className="flex gap-2 items-center">
                            <input
                              name="amount"
                              type="number"
                              step="0.01"
                              min="0.01"
                              max={tx.amount}
                              defaultValue={tx.amount}
                              className="h-7 w-24 rounded-lg border border-line bg-background px-2 text-xs"
                            />
                            <button
                              type="submit"
                              className="h-7 rounded-lg border border-danger px-3 text-xs font-semibold text-danger hover:bg-[#fef2f2]"
                            >
                              {t("transactions.refund")}
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
