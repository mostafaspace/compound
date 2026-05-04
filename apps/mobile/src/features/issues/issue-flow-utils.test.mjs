import test from "node:test";
import assert from "node:assert/strict";

import {
  getAvailableIssueTargetRoles,
  getDefaultIssueTargetRole,
  getIssueSubmitBlockReason,
  canEscalateIssueFromMobile,
} from "./issue-flow-utils.ts";

test("floor-scoped residents default complaints to the floor representative", () => {
  assert.equal(getDefaultIssueTargetRole(true), "floor_representative");
});

test("building-only residents cannot choose the floor representative route", () => {
  assert.deepEqual(getAvailableIssueTargetRoles(false), [
    "building_representative",
    "president",
    "compound_admin",
  ]);
});

test("issue submit is blocked while unit context is still loading", () => {
  assert.equal(
    getIssueSubmitBlockReason({ isLoadingUnits: true, hasPrimaryUnit: false }),
    "loading"
  );
});

test("issue submit is blocked when the resident has no verified unit", () => {
  assert.equal(
    getIssueSubmitBlockReason({ isLoadingUnits: false, hasPrimaryUnit: false }),
    "missing-unit"
  );
});

test("building representatives can escalate in mobile issue detail", () => {
  assert.equal(
    canEscalateIssueFromMobile({
      effectiveRoles: ["building_representative"],
      assignedTo: 42,
      currentUserId: 42,
    }),
    true
  );
});

test("floor representatives do not get an escalation action they cannot complete", () => {
  assert.equal(
    canEscalateIssueFromMobile({
      effectiveRoles: ["floor_representative"],
      assignedTo: 42,
      currentUserId: 42,
    }),
    false
  );
});
