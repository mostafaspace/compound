export const pollStatusValues = ["draft", "active", "closed", "archived"] as const;
export type PollStatus = (typeof pollStatusValues)[number];

export const pollScopeValues = ["compound", "building"] as const;
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

export interface Poll {
  id: string;
  compoundId: string;
  buildingId: string | null;
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
  hasVoted?: boolean | null;
  userVoteOptionIds?: number[] | null;
  voters?: PollVoter[];
  viewLogs?: Array<{
    userName: string;
    firstViewedAt: string;
    lastViewedAt: string;
    viewCount: number;
  }>;
  notificationLogs?: Array<{
    userName: string;
    notifiedAt: string;
    delivered: boolean;
  }>;
}

export interface CreatePollInput {
  compoundId: string;
  buildingId?: string;
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
}

export interface PollEligibilityResult {
  eligible: boolean;
  reason: string | null;
  hasVoted: boolean;
}

export interface CreatePollTypeInput {
  compoundId?: string;
  name: string;
  description?: string;
  color?: string;
  isActive?: boolean;
  sortOrder?: number;
}
