export const pollStatusValues = ["draft", "active", "closed", "archived"] as const;
export type PollStatus = (typeof pollStatusValues)[number];

export const pollScopeValues = ["compound", "building", "floor"] as const;
export type PollScope = (typeof pollScopeValues)[number];

export const pollEligibilityValues = ["owners_only", "owners_and_residents", "all_verified"] as const;
export type PollEligibility = (typeof pollEligibilityValues)[number];

export interface PollType {
  id: string;
  compoundId: string | null;
  name: string;
  description: string | null;
  color: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string | null;
}

export interface PollEligibleUnit {
  id: string;
  unitNumber: string | null;
  isPrimary: boolean;
}

export interface PollOption {
  id: number;
  label: string;
  sortOrder: number;
  votesCount: number;
}

export interface PollVoter {
  userId: number;
  userName: string | null;
  unitId: string | null;
  unitNumber: string | null;
  options: string[];
  votedAt: string | null;
}

export interface PollViewLog {
  userId: number;
  userName: string | null;
  unitId: string | null;
  unitNumber: string | null;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  viewCount: number;
}

export interface PollNotificationLog {
  userId: number;
  userName: string | null;
  unitId: string | null;
  unitNumber: string | null;
  channel: string;
  notifiedAt: string | null;
  delivered: boolean;
  deliveredAt: string | null;
}

export interface Poll {
  id: string;
  compoundId: string;
  buildingId: string | null;
  targetIds?: string[];
  pollTypeId: string | null;
  pollType?: PollType;
  title: string;
  description: string | null;
  status: PollStatus;
  scope: PollScope;
  allowMultiple: boolean;
  maxChoices: number | null;
  eligibility: PollEligibility;
  startsAt: string | null;
  endsAt: string | null;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  options?: PollOption[];
  votesCount: number;
  selectedUnitId?: string | null;
  hasVoted?: boolean | null;
  userVoteOptionIds?: number[] | null;
  voters?: PollVoter[];
  viewLogs?: PollViewLog[];
  notificationLogs?: PollNotificationLog[];
}

export interface CreatePollInput {
  compoundId: string;
  buildingId?: string;
  targetIds?: string[];
  pollTypeId?: string;
  title: string;
  description?: string;
  scope?: PollScope;
  allowMultiple?: boolean;
  maxChoices?: number;
  eligibility?: PollEligibility;
  startsAt?: string;
  endsAt?: string;
  options: Array<{ label: string }>;
}

export interface PollVoteInput {
  optionIds: number[];
  unitId?: string;
}

export interface PollEligibilityResult {
  eligible: boolean;
  reason: string | null;
  hasVoted: boolean;
  selectedUnitId?: string | null;
  requiresUnitSelection?: boolean;
  eligibleUnits?: PollEligibleUnit[];
}

export interface CreatePollTypeInput {
  compoundId?: string;
  name: string;
  description?: string;
  color?: string;
  isActive?: boolean;
  sortOrder?: number;
}
