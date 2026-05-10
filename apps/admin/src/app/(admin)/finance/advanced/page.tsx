import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import {
  getCurrentUser,
  getBudgets,
  getExpenses,
  getReserveFunds,
  getVendors,
} from "@/lib/api";
import { requireAdminUser } from "@/lib/session";
import type { BudgetStatus, ExpenseStatus, VendorType } from "@compound/contracts";
import { budgetPeriodTypeValues, expenseStatusValues, reserveFundMovementTypeValues, vendorTypeValues } from "@compound/contracts";

import {
  activateBudgetAction,
  addBudgetCategoryAction,
  approveExpenseAction,
  closeBudgetAction,
  createBudgetAction,
  createExpenseAction,
  createReserveFundAction,
  createReserveFundMovementAction,
  createVendorAction,
  rejectExpenseAction,
} from "./actions";

export default async function AdvancedFinancePage() {
  await requireAdminUser(getCurrentUser);
  const t = await getTranslations("AdvancedFinance");
  const nav = await getTranslations("Navigation");

  const [reserveFunds, vendors, budgets, pendingExpenses, approvedExpenses] = await Promise.all([
    getReserveFunds(),
    getVendors(),
    getBudgets(),
    getExpenses("pending_approval"),
    getExpenses("approved"),
  ]);

  const budgetStatusColor: Record<BudgetStatus, string> = {
    draft: "bg-background text-muted",
    active: "bg-[#e6f3ef] text-brand",
    closed: "bg-[#f3f4f6] text-muted",
  };

  const expenseStatusColor: Record<ExpenseStatus, string> = {
    draft: "bg-background text-muted",
    pending_approval: "bg-[#fff8e8] text-[#7a5d1a]",
    approved: "bg-[#e6f3ef] text-brand",
    rejected: "bg-[#fef2f2] text-danger",
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
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-10 px-5 py-8 lg:px-8">

        {/* ── Reserve Funds ─────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">{t("reserveFunds.title")}</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Create fund form */}
            <form action={createReserveFundAction} className="rounded-lg border border-line bg-panel p-5 space-y-3">
              <h3 className="text-sm font-semibold">{t("reserveFunds.create")}</h3>
              <label className="block text-xs font-semibold text-muted">
                {t("fields.name")}
                <input name="name" required className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-muted">
                {t("fields.description")}
                <input name="description" className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-muted">
                {t("fields.currency")}
                <input name="currency" defaultValue="EGP" className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" />
              </label>
              <button type="submit" className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong">
                {t("reserveFunds.createBtn")}
              </button>
            </form>

            {/* Fund list */}
            <div className="rounded-lg border border-line bg-panel overflow-hidden">
              <div className="p-4 border-b border-line">
                <h3 className="text-sm font-semibold">{t("reserveFunds.list")}</h3>
              </div>
              {reserveFunds.length === 0 ? (
                <p className="p-4 text-sm text-muted">{t("reserveFunds.empty")}</p>
              ) : (
                <div className="divide-y divide-line">
                  {reserveFunds.map((fund) => (
                    <div key={fund.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{fund.name}</span>
                        <span className="text-sm font-semibold text-brand">
                          {fund.balance} {fund.currency}
                        </span>
                      </div>
                      {/* Deposit / Withdrawal mini-form */}
                      <form action={createReserveFundMovementAction.bind(null, fund.id)} className="flex gap-2 flex-wrap items-end">
                        <label className="text-xs text-muted">
                          {t("reserveFunds.movementType")}
                          <select name="type" className="mt-1 h-8 rounded-lg border border-line bg-background px-2 text-xs">
                            {reserveFundMovementTypeValues.map((v) => (
                              <option key={v} value={v}>{t(`movementTypes.${v}` as Parameters<typeof t>[0])}</option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs text-muted">
                          {t("fields.amount")}
                          <input name="amount" type="number" step="0.01" min="0.01" required className="mt-1 h-8 w-28 rounded-lg border border-line bg-background px-2 text-xs" />
                        </label>
                        <label className="text-xs text-muted">
                          {t("fields.description")}
                          <input name="description" className="mt-1 h-8 w-32 rounded-lg border border-line bg-background px-2 text-xs" />
                        </label>
                        <button type="submit" className="h-8 rounded-lg border border-brand px-3 text-xs font-semibold text-brand hover:bg-[#e6f3ef]">
                          {t("reserveFunds.addMovement")}
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Vendors ───────────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">{t("vendors.title")}</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Create vendor */}
            <form action={createVendorAction} className="rounded-lg border border-line bg-panel p-5 space-y-3">
              <h3 className="text-sm font-semibold">{t("vendors.create")}</h3>
              <label className="block text-xs font-semibold text-muted">
                {t("fields.name")}
                <input name="name" required className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-muted">
                {t("fields.type")}
                <select name="type" className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm">
                  {vendorTypeValues.map((v) => (
                    <option key={v} value={v}>{t(`vendorTypes.${v}` as Parameters<typeof t>[0])}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-muted">
                  {t("fields.contactName")}
                  <input name="contact_name" className="mt-1 h-9 w-full rounded-lg border border-line bg-background px-3 text-sm" />
                </label>
                <label className="text-xs font-semibold text-muted">
                  {t("fields.phone")}
                  <input name="phone" type="tel" className="mt-1 h-9 w-full rounded-lg border border-line bg-background px-3 text-sm" />
                </label>
                <label className="text-xs font-semibold text-muted col-span-2">
                  {t("fields.email")}
                  <input name="email" type="email" className="mt-1 h-9 w-full rounded-lg border border-line bg-background px-3 text-sm" />
                </label>
              </div>
              <button type="submit" className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong">
                {t("vendors.createBtn")}
              </button>
            </form>

            {/* Vendor list */}
            <div className="rounded-lg border border-line bg-panel overflow-hidden">
              <div className="p-4 border-b border-line">
                <h3 className="text-sm font-semibold">{t("vendors.list")}</h3>
              </div>
              {vendors.length === 0 ? (
                <p className="p-4 text-sm text-muted">{t("vendors.empty")}</p>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-background text-muted text-xs">
                    <tr>
                      <th className="px-4 py-2 text-start font-semibold">{t("fields.name")}</th>
                      <th className="px-4 py-2 text-start font-semibold">{t("fields.type")}</th>
                      <th className="px-4 py-2 text-start font-semibold">{t("fields.email")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {vendors.map((v) => (
                      <tr key={v.id}>
                        <td className="px-4 py-3">{v.name}</td>
                        <td className="px-4 py-3 text-xs text-muted">{v.typeLabel}</td>
                        <td className="px-4 py-3 text-xs text-muted">{v.email ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>

        {/* ── Budgets ────────────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">{t("budgets.title")}</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Create budget */}
            <form action={createBudgetAction} className="rounded-lg border border-line bg-panel p-5 space-y-3">
              <h3 className="text-sm font-semibold">{t("budgets.create")}</h3>
              <label className="block text-xs font-semibold text-muted">
                {t("fields.name")}
                <input name="name" required className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-muted">
                  {t("fields.periodType")}
                  <select name="period_type" className="mt-1 h-9 w-full rounded-lg border border-line bg-background px-3 text-sm">
                    {budgetPeriodTypeValues.map((v) => (
                      <option key={v} value={v}>{t(`periodTypes.${v}` as Parameters<typeof t>[0])}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-muted">
                  {t("fields.periodYear")}
                  <input name="period_year" type="number" defaultValue={new Date().getFullYear()} min={2000} max={2100} required className="mt-1 h-9 w-full rounded-lg border border-line bg-background px-3 text-sm" />
                </label>
              </div>
              <button type="submit" className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong">
                {t("budgets.createBtn")}
              </button>
            </form>

            {/* Budget list */}
            <div className="rounded-lg border border-line bg-panel overflow-hidden">
              <div className="p-4 border-b border-line">
                <h3 className="text-sm font-semibold">{t("budgets.list")}</h3>
              </div>
              {budgets.length === 0 ? (
                <p className="p-4 text-sm text-muted">{t("budgets.empty")}</p>
              ) : (
                <div className="divide-y divide-line">
                  {budgets.map((budget) => (
                    <div key={budget.id} className="p-4 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-sm">{budget.name}</span>
                        <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${budgetStatusColor[budget.status]}`}>
                          {budget.statusLabel}
                        </span>
                        <span className="text-xs text-muted">{budget.periodYear}</span>
                      </div>
                      <div className="text-xs text-muted">
                        {t("budgets.planned")}: {budget.totalPlanned} · {t("budgets.actual")}: {budget.totalActual}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {budget.status === "draft" && (
                          <form action={activateBudgetAction.bind(null, budget.id)}>
                            <button type="submit" className="h-7 rounded-lg border border-brand px-3 text-xs font-semibold text-brand hover:bg-[#e6f3ef]">
                              {t("budgets.activate")}
                            </button>
                          </form>
                        )}
                        {budget.status === "active" && (
                          <form action={closeBudgetAction.bind(null, budget.id)}>
                            <button type="submit" className="h-7 rounded-lg border border-line px-3 text-xs font-semibold text-muted hover:border-foreground">
                              {t("budgets.close")}
                            </button>
                          </form>
                        )}
                        {/* Add category form */}
                        {budget.status !== "closed" && (
                          <form action={addBudgetCategoryAction.bind(null, budget.id)} className="flex gap-2 items-center flex-wrap mt-1">
                            <input name="name" placeholder={t("budgets.categoryName")} required className="h-7 rounded-lg border border-line bg-background px-2 text-xs" />
                            <input name="planned_amount" type="number" step="0.01" placeholder={t("fields.amount")} required className="h-7 w-24 rounded-lg border border-line bg-background px-2 text-xs" />
                            <button type="submit" className="h-7 rounded-lg border border-line px-3 text-xs font-semibold text-muted hover:border-brand hover:text-brand">
                              + {t("budgets.addCategory")}
                            </button>
                          </form>
                        )}
                      </div>
                      {/* Category list */}
                      {budget.categories.length > 0 && (
                        <div className="rounded-lg bg-background p-2 space-y-1">
                          {budget.categories.map((cat) => (
                            <div key={cat.id} className="flex justify-between text-xs">
                              <span>{cat.name}</span>
                              <span className="text-muted">{cat.actualAmount} / {cat.plannedAmount}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Expenses ──────────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">{t("expenses.title")}</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Create expense */}
            <form action={createExpenseAction} className="rounded-lg border border-line bg-panel p-5 space-y-3">
              <h3 className="text-sm font-semibold">{t("expenses.create")}</h3>
              <label className="block text-xs font-semibold text-muted">
                {t("fields.title")}
                <input name="title" required className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-muted">
                  {t("fields.amount")}
                  <input name="amount" type="number" step="0.01" min="0.01" required className="mt-1 h-9 w-full rounded-lg border border-line bg-background px-3 text-sm" />
                </label>
                <label className="text-xs font-semibold text-muted">
                  {t("fields.expenseDate")}
                  <input name="expense_date" type="date" required className="mt-1 h-9 w-full rounded-lg border border-line bg-background px-3 text-sm" />
                </label>
              </div>
              {vendors.length > 0 && (
                <label className="block text-xs font-semibold text-muted">
                  {t("fields.vendor")}
                  <select name="vendor_id" className="mt-1 h-9 w-full rounded-lg border border-line bg-background px-3 text-sm">
                    <option value="">{t("expenses.noVendor")}</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </label>
              )}
              <button type="submit" className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong">
                {t("expenses.createBtn")}
              </button>
            </form>

            {/* Pending approvals */}
            <div className="rounded-lg border border-line bg-panel overflow-hidden">
              <div className="p-4 border-b border-line">
                <h3 className="text-sm font-semibold">{t("expenses.pending")}</h3>
              </div>
              {pendingExpenses.length === 0 ? (
                <p className="p-4 text-sm text-muted">{t("expenses.noPending")}</p>
              ) : (
                <div className="divide-y divide-line">
                  {pendingExpenses.map((exp) => (
                    <div key={exp.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-sm">{exp.title}</span>
                        <span className="font-semibold text-sm">{exp.amount} {exp.currency}</span>
                      </div>
                      <p className="text-xs text-muted">{exp.expenseDate}</p>
                      <div className="flex gap-2">
                        <form action={approveExpenseAction.bind(null, exp.id)}>
                          <button type="submit" className="h-8 rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-strong">
                            {t("expenses.approve")}
                          </button>
                        </form>
                        <form action={rejectExpenseAction.bind(null, exp.id)} className="flex gap-2">
                          <input name="reason" placeholder={t("expenses.rejectReason")} required className="h-8 rounded-lg border border-line bg-background px-2 text-xs" />
                          <button type="submit" className="h-8 rounded-lg border border-danger px-3 text-xs font-semibold text-danger hover:bg-[#fef2f2]">
                            {t("expenses.reject")}
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Approved expenses */}
          {approvedExpenses.length > 0 && (
            <div className="mt-4 rounded-lg border border-line bg-panel overflow-hidden">
              <div className="p-4 border-b border-line">
                <h3 className="text-sm font-semibold">{t("expenses.approved")}</h3>
              </div>
              <table className="w-full border-collapse text-sm">
                <thead className="bg-background text-muted text-xs">
                  <tr>
                    <th className="px-4 py-2 text-start font-semibold">{t("fields.title")}</th>
                    <th className="px-4 py-2 text-start font-semibold">{t("fields.amount")}</th>
                    <th className="px-4 py-2 text-start font-semibold">{t("fields.expenseDate")}</th>
                    <th className="px-4 py-2 text-start font-semibold">{t("fields.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {approvedExpenses.map((exp) => (
                    <tr key={exp.id}>
                      <td className="px-4 py-3">{exp.title}</td>
                      <td className="px-4 py-3 font-semibold">{exp.amount} {exp.currency}</td>
                      <td className="px-4 py-3 text-muted text-xs">{exp.expenseDate}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${expenseStatusColor[exp.status]}`}>
                          {exp.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
