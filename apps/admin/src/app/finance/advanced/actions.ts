"use server";

import { revalidatePath } from "next/cache";

import { config } from "@/lib/config";
import { getAuthToken, getCompoundContext } from "@/lib/session";

async function advancedFinanceHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const compoundId = await getCompoundContext();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (compoundId) headers["X-Compound-Id"] = compoundId;
  return headers;
}

// ── Reserve Funds ─────────────────────────────────────────────────────────────

export async function createReserveFundAction(formData: FormData) {
  const compoundId = await getCompoundContext();
  const headers = await advancedFinanceHeaders();

  await fetch(`${config.apiBaseUrl}/finance/reserve-funds`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      compound_id: compoundId,
      name: formData.get("name"),
      description: formData.get("description") || undefined,
      currency: formData.get("currency") || "EGP",
    }),
  });

  revalidatePath("/finance/advanced");
}

export async function createReserveFundMovementAction(fundId: string, formData: FormData) {
  const headers = await advancedFinanceHeaders();

  await fetch(`${config.apiBaseUrl}/finance/reserve-funds/${fundId}/movements`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      type: formData.get("type"),
      amount: Number(formData.get("amount")),
      description: formData.get("description") || undefined,
    }),
  });

  revalidatePath("/finance/advanced");
}

// ── Vendors ───────────────────────────────────────────────────────────────────

export async function createVendorAction(formData: FormData) {
  const compoundId = await getCompoundContext();
  const headers = await advancedFinanceHeaders();

  await fetch(`${config.apiBaseUrl}/finance/vendors`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      compound_id: compoundId,
      name: formData.get("name"),
      type: formData.get("type") || "other",
      contact_name: formData.get("contact_name") || undefined,
      phone: formData.get("phone") || undefined,
      email: formData.get("email") || undefined,
    }),
  });

  revalidatePath("/finance/advanced");
}

// ── Budgets ───────────────────────────────────────────────────────────────────

export async function createBudgetAction(formData: FormData) {
  const compoundId = await getCompoundContext();
  const headers = await advancedFinanceHeaders();

  await fetch(`${config.apiBaseUrl}/finance/budgets`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      compound_id: compoundId,
      name: formData.get("name"),
      period_type: formData.get("period_type") || "annual",
      period_year: Number(formData.get("period_year")) || new Date().getFullYear(),
      notes: formData.get("notes") || undefined,
    }),
  });

  revalidatePath("/finance/advanced");
}

export async function activateBudgetAction(budgetId: string) {
  const headers = await advancedFinanceHeaders();

  await fetch(`${config.apiBaseUrl}/finance/budgets/${budgetId}/activate`, {
    method: "POST",
    headers,
  });

  revalidatePath("/finance/advanced");
}

export async function closeBudgetAction(budgetId: string) {
  const headers = await advancedFinanceHeaders();

  await fetch(`${config.apiBaseUrl}/finance/budgets/${budgetId}/close`, {
    method: "POST",
    headers,
  });

  revalidatePath("/finance/advanced");
}

export async function addBudgetCategoryAction(budgetId: string, formData: FormData) {
  const headers = await advancedFinanceHeaders();

  await fetch(`${config.apiBaseUrl}/finance/budgets/${budgetId}/categories`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: formData.get("name"),
      planned_amount: Number(formData.get("planned_amount")),
      notes: formData.get("notes") || undefined,
    }),
  });

  revalidatePath("/finance/advanced");
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function createExpenseAction(formData: FormData) {
  const compoundId = await getCompoundContext();
  const headers = await advancedFinanceHeaders();

  await fetch(`${config.apiBaseUrl}/finance/expenses`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      compound_id: compoundId,
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      amount: Number(formData.get("amount")),
      expense_date: formData.get("expense_date"),
      vendor_id: formData.get("vendor_id") || undefined,
      budget_category_id: formData.get("budget_category_id") || undefined,
    }),
  });

  revalidatePath("/finance/advanced");
}

export async function approveExpenseAction(expenseId: string, formData: FormData) {
  const headers = await advancedFinanceHeaders();

  await fetch(`${config.apiBaseUrl}/finance/expenses/${expenseId}/approve`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      reason: formData.get("reason") || undefined,
    }),
  });

  revalidatePath("/finance/advanced");
}

export async function rejectExpenseAction(expenseId: string, formData: FormData) {
  const headers = await advancedFinanceHeaders();

  await fetch(`${config.apiBaseUrl}/finance/expenses/${expenseId}/reject`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      reason: formData.get("reason"),
    }),
  });

  revalidatePath("/finance/advanced");
}
