import { AuthenticatedUser } from "@compound/contracts";

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Guard: undefined;
  Admin: undefined;
  Restoring: undefined;
  CreateVisitor: undefined;
  ShareVisitorPass: { visitorId: string };
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
  Settings: undefined;
};

export type MoreStackParamList = {
  MoreHome: undefined;
  Notifications: undefined;
  Announcements: undefined;
  Property: undefined;
  OrgChart: undefined;
};

export type GuardStackParamList = {
  Gate: undefined;
  Scanner: undefined;
  Invitations: undefined;
};
