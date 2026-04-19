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
