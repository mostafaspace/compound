import type { NavigatorScreenParams } from "@react-navigation/native";
import { Issue } from "@compound/contracts";

export type RootStackParamList = {
  Auth: undefined;
  OwnerRegistration: undefined;
  Main: undefined;
  Guard: undefined;
  Admin: undefined;
  Restoring: undefined;
  CreateVisitor: undefined;
  ShareVisitorPass: { visitorId: string };
  PollDetail: { pollId: string };
  AddEditIssue: { issue?: Issue };
  IssueDetail: { issue: Issue };
  UploadDocument: undefined;
  AdminInvitations: undefined;
  CreateInvitation: undefined;
  AuditLog: undefined;
  AuditLogTimeline: { entityType: string; entityId: string };
  CreateAnnouncement: undefined;
  CreatePoll: undefined;
  VehicleNotifySearch: undefined;
  VehicleNotifyInbox: undefined;
  NotificationsCenter: undefined;
  DocumentViewer: { url: string; title?: string; mimeType?: string | null };
  ApartmentDetail: { unitId: string; adminMode?: boolean };
};

export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Apartments: NavigatorScreenParams<ApartmentsStackParamList> | undefined;
  Visitors: undefined;
  Polls: undefined;
  More: NavigatorScreenParams<MoreStackParamList> | undefined;
};

export type ApartmentsStackParamList = {
  ApartmentsList: undefined;
  ApartmentDetail: { unitId: string; adminMode?: boolean };
};

export type AdminTabParamList = {
  Dashboard: undefined;
  Visitors: undefined;
  Finance: undefined;
  Units: undefined;
  More: NavigatorScreenParams<MoreStackParamList> | undefined;
};

export type MoreStackParamList = {
  MoreHome: undefined;
  Notifications: undefined;
  Announcements: undefined;
  OrgChart: undefined;
  Settings: undefined;
  Issues: undefined;
  VerificationStatus: undefined;
  PrivacySettings: undefined;
  Polls: undefined;
};

export type GuardStackParamList = {
  Gate: undefined;
  Scanner: undefined;
  Invitations: undefined;
  Settings: undefined;
};
