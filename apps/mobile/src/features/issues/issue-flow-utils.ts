import type { Issue, IssueTargetRole } from "@compound/contracts";

export type IssueSubmitBlockReason = "loading" | "missing-unit" | null;

interface IssueSubmitBlockContext {
  isLoadingUnits: boolean;
  hasPrimaryUnit: boolean;
}

interface IssueEscalationContext {
  effectiveRoles: string[];
  assignedTo: Issue["assignedTo"];
  currentUserId: number | null | undefined;
}

const TARGETS_WITH_FLOOR_SCOPE: IssueTargetRole[] = [
  "floor_representative",
  "building_representative",
  "president",
  "compound_admin",
];

const TARGETS_WITHOUT_FLOOR_SCOPE: IssueTargetRole[] = [
  "building_representative",
  "president",
  "compound_admin",
];

export function getDefaultIssueTargetRole(
  hasFloorScope: boolean,
  effectiveRoles: string[] = [],
): IssueTargetRole {
  return getAvailableIssueTargetRoles(hasFloorScope, effectiveRoles)[0] ?? "compound_admin";
}

export function getAvailableIssueTargetRoles(
  hasFloorScope: boolean,
  effectiveRoles: string[] = [],
): IssueTargetRole[] {
  const baseTargets = hasFloorScope
    ? TARGETS_WITH_FLOOR_SCOPE
    : TARGETS_WITHOUT_FLOOR_SCOPE;

  return baseTargets.filter((target) => !isSameIssueTargetRole(target, effectiveRoles));
}

function isSameIssueTargetRole(target: IssueTargetRole, effectiveRoles: string[]): boolean {
  if (target === "compound_admin") {
    return effectiveRoles.includes("compound_admin") || effectiveRoles.includes("compound_head");
  }

  return effectiveRoles.includes(target);
}

export function getIssueSubmitBlockReason({
  isLoadingUnits,
  hasPrimaryUnit,
}: IssueSubmitBlockContext): IssueSubmitBlockReason {
  if (isLoadingUnits) {
    return "loading";
  }

  if (!hasPrimaryUnit) {
    return "missing-unit";
  }

  return null;
}

export function canEscalateIssueFromMobile({
  effectiveRoles,
  assignedTo,
  currentUserId,
}: IssueEscalationContext): boolean {
  if (
    effectiveRoles.includes("super_admin") ||
    effectiveRoles.includes("compound_admin") ||
    effectiveRoles.includes("president") ||
    effectiveRoles.includes("support_agent")
  ) {
    return true;
  }

  if (effectiveRoles.includes("building_representative")) {
    return assignedTo !== null && assignedTo === currentUserId;
  }

  return false;
}
