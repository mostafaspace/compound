import { AuthenticatedUser } from "@compound/contracts";

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Guard: undefined;
  Restoring: undefined;
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
  Settings: undefined;
};
