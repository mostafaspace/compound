export const voteTypeValues = ["poll", "election", "decision"] as const;
export type VoteType = (typeof voteTypeValues)[number];

export const voteStatusValues = ["draft", "active", "closed", "cancelled"] as const;
export type VoteStatus = (typeof voteStatusValues)[number];

export const voteScopeValues = ["compound", "building"] as const;
export type VoteScope = (typeof voteScopeValues)[number];

export const voteEligibilityValues = ["owners_only", "owners_and_residents", "all_verified"] as const;
export type VoteEligibility = (typeof voteEligibilityValues)[number];

export interface VoteOption {
  id: number;
  label: string;
  sortOrder: number;
}

export interface VoteTallyRow {
  optionId: number;
  label: string;
  count: number;
}

export interface VoteVoter {
  userId: number;
  userName: string | null;
  unitId: string | null;
  unitNumber: string | null;
  optionId: number;
  option: string | null;
  votedAt: string | null;
}

export interface Vote {
  id: string;
  compoundId: string;
  buildingId: string | null;
  type: VoteType;
  title: string;
  description: string | null;
  status: VoteStatus;
  scope: VoteScope;
  eligibility: VoteEligibility;
  requiresDocCompliance: boolean;
  isAnonymous: boolean;
  startsAt: string | null;
  endsAt: string | null;
  resultAppliedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  options?: VoteOption[];
  participationsCount?: number;
  tally?: VoteTallyRow[];
}

export interface CreateVoteInput {
  compoundId: string;
  buildingId?: string;
  type: VoteType;
  title: string;
  description?: string;
  scope?: VoteScope;
  eligibility?: VoteEligibility;
  requiresDocCompliance?: boolean;
  isAnonymous?: boolean;
  startsAt?: string;
  endsAt?: string;
  options: Array<{ label: string }>;
}

export interface VoteEligibilityResult {
  eligible: boolean;
  reason: string | null;
  hasVoted: boolean;
}

export interface VoteFilters {
  status?: VoteStatus | "all";
  type?: VoteType | "all";
  compoundId?: string;
}
