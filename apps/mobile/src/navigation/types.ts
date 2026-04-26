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
  More: undefined;
};

export type GuardStackParamList = {
  Gate: undefined;
  Scanner: undefined;
  Settings: undefined;
};
