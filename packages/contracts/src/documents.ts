export const documentStatusValues = ["submitted", "under_review", "approved", "rejected", "missing"] as const;

export type DocumentStatus = (typeof documentStatusValues)[number];

export interface DocumentType {
  id: number;
  key: string;
  name: string;
  description: string | null;
  isRequiredDefault: boolean;
  allowedMimeTypes: string[] | null;
  maxFileSizeKb: number;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UserDocument {
  id: number;
  documentTypeId: number;
  documentType?: DocumentType;
  userId: number;
  unitId: string | null;
  status: DocumentStatus;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  reviewNote: string | null;
  reviewedBy: number | null;
  reviewedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
