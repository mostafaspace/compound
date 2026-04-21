export const ledgerEntryTypeValues = [
  "opening_balance",
  "charge",
  "penalty",
  "payment",
  "allocation",
  "adjustment",
  "refund",
  "write_off"
] as const;

export type LedgerEntryType = (typeof ledgerEntryTypeValues)[number];

export const paymentStatusValues = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "allocated",
  "refunded"
] as const;

export type PaymentStatus = (typeof paymentStatusValues)[number];

export interface MoneyAmount {
  amount: string;
  currency: "EGP" | "USD" | "EUR" | string;
}

export interface UnitAccount {
  id: string;
  unitId: string;
  balance: string;
  currency: string;
  ledgerEntries?: LedgerEntry[];
  paymentSubmissions?: PaymentSubmission[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface LedgerEntry {
  id: number;
  unitAccountId: string;
  type: LedgerEntryType;
  amount: string;
  description: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdBy: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PaymentSubmission {
  id: string;
  unitAccountId: string;
  submittedBy: number | null;
  amount: string;
  currency: string;
  method: string;
  reference: string | null;
  hasProof: boolean;
  status: PaymentStatus;
  notes: string | null;
  metadata: Record<string, unknown>;
  reviewedBy: number | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateUnitAccountInput {
  unitId: string;
  currency?: string;
  openingBalance?: number;
  description?: string;
}

export interface CreateLedgerEntryInput {
  type: Exclude<LedgerEntryType, "payment">;
  amount: number;
  description: string;
}

export interface CreatePaymentSubmissionInput {
  amount: number;
  currency?: string;
  method: string;
  reference?: string;
  notes?: string;
}

export type ChargeFrequency = 'monthly' | 'quarterly' | 'annual' | 'one_time';
export type CampaignStatus = 'draft' | 'active' | 'closed' | 'archived';

export interface ChargeType {
  id: string;
  name: string;
  code: string;
  defaultAmount: string | null;
  isRecurring: boolean;
  createdAt: string;
}

export interface RecurringCharge {
  id: string;
  compoundId: string;
  chargeTypeId: string | null;
  name: string;
  amount: string;
  currency: string;
  frequency: ChargeFrequency;
  billingDay: number | null;
  targetType: 'all' | 'floor' | 'unit';
  targetIds: string[] | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  lastRunAt: string | null;
  createdAt: string;
}

export interface CollectionCampaign {
  id: string;
  compoundId: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  targetAmount: string | null;
  startedAt: string | null;
  closedAt: string | null;
  createdAt: string;
}
