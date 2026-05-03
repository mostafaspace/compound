import { Issue } from "@compound/contracts";

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Guard: undefined;
  Admin: undefined;
  Restoring: undefined;
  CreateVisitor: undefined;
  ShareVisitorPass: { visitorId: string };
  PollDetail: { pollId: string };
  CreateIssue: undefined;
  IssueDetail: { issue: Issue };
  UploadDocument: undefined;
  AdminInvitations: undefined;
  CreateInvitation: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Property: undefined;
  Visitors: undefined;
  Finance: undefined;
  Governance: undefined;
  More: undefined;
};

export type AdminTabParamList = {
  Dashboard: undefined;
  Visitors: undefined;
  Finance: undefined;
  Units: undefined;
  More: undefined;
};

export type MoreStackParamList = {
  MoreHome: undefined;
  Notifications: undefined;
  Announcements: undefined;
  Property: undefined;
  OrgChart: undefined;
  Settings: undefined;
  Issues: undefined;
  Documents: undefined;
  VerificationStatus: undefined;
  PrivacySettings: undefined;
  Polls: undefined;
};

export type GuardStackParamList = {
  Gate: undefined;
  Scanner: undefined;
  Invitations: undefined;
};
