export const importBatchTypeValues = ["units", "users", "opening_balances"] as const;
export type ImportBatchType = (typeof importBatchTypeValues)[number];

export const importBatchStatusValues = ["pending", "processing", "completed", "failed"] as const;
export type ImportBatchStatus = (typeof importBatchStatusValues)[number];

export interface ImportRowError {
  row: number;
  field: string | null;
  message: string;
}

export interface ImportBatch {
  id: string;
  type: ImportBatchType;
  typeLabel: string;
  status: ImportBatchStatus;
  originalFilename: string;
  isDryRun: boolean;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  errors?: ImportRowError[];
  compound?: { id: string; name: string };
  actor?: { id: number; name: string };
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface RunImportInput {
  compound_id: string;
  type: ImportBatchType;
  file: File;
  dry_run?: boolean;
}
