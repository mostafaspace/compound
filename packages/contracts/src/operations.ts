export const issueStatusValues = [
  "new",
  "triaged",
  "assigned",
  "in_progress",
  "waiting_for_resident",
  "resolved",
  "closed",
  "reopened"
] as const;

export type IssueStatus = (typeof issueStatusValues)[number];

export const visitorPassStatusValues = ["active", "used", "expired", "revoked"] as const;

export type VisitorPassStatus = (typeof visitorPassStatusValues)[number];
