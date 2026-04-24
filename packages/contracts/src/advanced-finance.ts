// ── Enums ──────────────────────────────────────────────────────────────────

export const reserveFundMovementTypeValues = ["deposit", "withdrawal", "transfer"] as const;
export type ReserveFundMovementType = (typeof reserveFundMovementTypeValues)[number];

export const budgetPeriodTypeValues = ["annual", "monthly"] as const;
export type BudgetPeriodType = (typeof budgetPeriodTypeValues)[number];

export const budgetStatusValues = ["draft", "active", "closed"] as const;
export type BudgetStatus = (typeof budgetStatusValues)[number];

export const expenseStatusValues = ["draft", "pending_approval", "approved", "rejected"] as const;
export type ExpenseStatus = (typeof expenseStatusValues)[number];

export const vendorTypeValues = [
  "contractor",
  "supplier",
  "service_provider",
  "legal_advisor",
  "other",
] as const;
export type VendorType = (typeof vendorTypeValues)[number];

// ── Reserve Funds ────────────────────────────────────────────────────────────

export interface ReserveFund {
  id: string;
  name: string;
  description: string | null;
  balance: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReserveFundMovement {
  id: string;
  type: ReserveFundMovementType;
  typeLabel: string;
  amount: string;
  description: string | null;
  reference: string | null;
  createdBy?: { id: number; name: string } | null;
  createdAt: string;
}

export interface CreateReserveFundInput {
  compound_id: string;
  name: string;
  description?: string;
  currency?: string;
}

export interface CreateReserveFundMovementInput {
  type: ReserveFundMovementType;
  amount: number;
  description?: string;
  reference?: string;
}

// ── Vendors ──────────────────────────────────────────────────────────────────

export interface Vendor {
  id: string;
  name: string;
  type: VendorType;
  typeLabel: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateVendorInput {
  compound_id: string;
  name: string;
  type?: VendorType;
  contact_name?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

// ── Budgets ──────────────────────────────────────────────────────────────────

export interface BudgetCategory {
  id: string;
  name: string;
  plannedAmount: string;
  actualAmount: string;
  variance: string;
  notes: string | null;
  createdAt: string;
}

export interface Budget {
  id: string;
  name: string;
  periodType: BudgetPeriodType;
  periodYear: number;
  periodMonth: number | null;
  status: BudgetStatus;
  statusLabel: string;
  notes: string | null;
  totalPlanned: string;
  totalActual: string;
  categories: BudgetCategory[];
  createdAt: string;
  closedAt: string | null;
}

export interface CreateBudgetInput {
  compound_id: string;
  name: string;
  period_type: BudgetPeriodType;
  period_year: number;
  period_month?: number;
  notes?: string;
}

// ── Expenses ─────────────────────────────────────────────────────────────────

export interface ExpenseApproval {
  id: string;
  action: "approve" | "reject";
  reason: string | null;
  actor?: { id: number; name: string } | null;
  createdAt: string;
}

export interface Expense {
  id: string;
  title: string;
  description: string | null;
  amount: string;
  currency: string;
  expenseDate: string;
  status: ExpenseStatus;
  statusLabel: string;
  receiptPath: string | null;
  rejectionReason: string | null;
  budgetCategory?: { id: string; name: string } | null;
  vendor?: { id: string; name: string } | null;
  submittedBy?: { id: number; name: string } | null;
  approvedBy?: { id: number; name: string } | null;
  approvedAt: string | null;
  approvals?: ExpenseApproval[];
  createdAt: string;
}

export interface CreateExpenseInput {
  compound_id: string;
  budget_category_id?: string;
  vendor_id?: string;
  title: string;
  description?: string;
  amount: number;
  currency?: string;
  expense_date: string;
}

// ── Online Payments ───────────────────────────────────────────────────────────

export const paymentSessionStatusValues = ["pending", "confirmed", "failed", "expired", "refunded"] as const;
export type PaymentSessionStatus = (typeof paymentSessionStatusValues)[number];

export const gatewayTransactionStatusValues = ["confirmed", "failed", "refunded", "disputed"] as const;
export type GatewayTransactionStatus = (typeof gatewayTransactionStatusValues)[number];

export interface PaymentSession {
  id: string;
  unitAccount?: { id: string; unit?: { id: string; unit_number: string } } | null;
  provider: string;
  providerSessionId: string | null;
  amount: string;
  currency: string;
  status: PaymentSessionStatus;
  statusLabel: string;
  redirectUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface GatewayTransaction {
  id: string;
  provider: string;
  providerTransactionId: string;
  eventType: string;
  status: GatewayTransactionStatus;
  statusLabel: string;
  amount: string;
  currency: string;
  processed: boolean;
  paymentSubmissionId: string | null;
  createdAt: string;
}
