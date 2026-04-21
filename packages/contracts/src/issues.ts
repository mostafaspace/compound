import type { AuthenticatedUser } from "./platform";
import type { IssueStatus } from "./operations";
import type { BuildingSummary, CompoundSummary, UnitSummary } from "./property";

export const issueCategoryValues = ["maintenance", "security", "cleaning", "noise", "other"] as const;

export type IssueCategory = (typeof issueCategoryValues)[number];

export const issuePriorityValues = ["low", "normal", "high", "urgent"] as const;

export type IssuePriority = (typeof issuePriorityValues)[number];

export interface Issue {
  id: string;
  compoundId: string;
  buildingId: string | null;
  unitId: string | null;
  reportedBy: number | null;
  assignedTo: number | null;
  category: IssueCategory;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  compound?: CompoundSummary;
  building?: BuildingSummary | null;
  unit?: UnitSummary | null;
  reporter?: AuthenticatedUser | null;
  assignee?: AuthenticatedUser | null;
  comments?: IssueComment[];
}

export interface IssueComment {
  id: number;
  issueId: string;
  userId: number | null;
  body: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
  user?: AuthenticatedUser | null;
}

export interface CreateIssueInput {
  unitId?: string;
  buildingId?: string;
  category: IssueCategory;
  title: string;
  description: string;
  priority?: IssuePriority;
}

export interface UpdateIssueInput {
  status?: IssueStatus;
  priority?: IssuePriority;
  assignedTo?: number | null;
  categoryId?: IssueCategory;
}

export interface CreateIssueCommentInput {
  body: string;
  isInternal?: boolean;
}

export interface IssueAttachment {
  id: string;
  issueId: string;
  uploadedBy: number | null;
  originalName: string;
  mimeType: string | null;
  size: number;
  createdAt: string;
}
