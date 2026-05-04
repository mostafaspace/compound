export const uatPersonaPassword = "uat-password-2026";

export const uatPersonaEmails = {
  admin: "compound-admin@uat.compound.local",
  resident: "resident-owner@uat.compound.local",
  security: "security-guard@uat.compound.local",
  board: "board-member@uat.compound.local",
} as const;

export type UatPersonaKey = keyof typeof uatPersonaEmails;
