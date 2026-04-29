import test from "node:test";
import assert from "node:assert/strict";

import {
  formatRoleLabel,
  getEffectiveRoleType,
  getEffectiveRoleNames,
  getPrimaryEffectiveRole,
  hasAnyEffectiveRole,
  hasEffectiveRole,
  isEffectiveSuperAdmin,
} from "./auth-access.ts";

function makeUser(overrides = {}) {
  return {
    id: 1,
    name: "Test User",
    email: "test@example.com",
    phone: null,
    compoundId: "cmp_1",
    role: "resident_owner",
    status: "active",
    emailVerifiedAt: null,
    lastLoginAt: null,
    roles: [],
    permissions: [],
    scopes: [],
    ...overrides,
  };
}

test("hasEffectiveRole uses both legacy role and RBAC roles", () => {
  const user = makeUser({
    role: "resident_owner",
    roles: ["finance_reviewer"],
  });

  assert.equal(hasEffectiveRole(user, "finance_reviewer"), true);
  assert.equal(hasEffectiveRole(user, "super_admin"), false);
});

test("explicit RBAC roles override stale legacy role values", () => {
  const user = makeUser({
    role: "resident_owner",
    roles: ["finance_reviewer"],
  });

  assert.equal(hasEffectiveRole(user, "resident_owner"), false);
  assert.equal(getEffectiveRoleType(user), "admin");
});

test("hasEffectiveRole treats compound_head as compound_admin", () => {
  const user = makeUser({
    role: "resident_owner",
    roles: ["compound_head"],
  });

  assert.equal(hasEffectiveRole(user, "compound_admin"), true);
});

test("getEffectiveRoleNames expands aliases without keeping stale legacy role when explicit roles exist", () => {
  const user = makeUser({
    role: "resident_owner",
    roles: ["compound_head"],
  });

  assert.deepEqual(getEffectiveRoleNames(user), ["compound_head", "compound_admin"]);
});

test("getPrimaryEffectiveRole prefers explicit RBAC role for display", () => {
  const user = makeUser({
    role: "resident_owner",
    roles: ["security_guard"],
  });

  assert.equal(getPrimaryEffectiveRole(user), "security_guard");
});

test("formatRoleLabel humanizes underscore role names", () => {
  assert.equal(formatRoleLabel("compound_head"), "compound head");
});

test("isEffectiveSuperAdmin trusts RBAC super_admin even when legacy role is stale", () => {
  const user = makeUser({
    role: "resident_owner",
    roles: ["super_admin"],
  });

  assert.equal(isEffectiveSuperAdmin(user), true);
});

test("getEffectiveRoleType routes based on effective RBAC roles", () => {
  const admin = makeUser({
    role: "resident_owner",
    roles: ["finance_reviewer"],
  });
  const security = makeUser({
    role: "resident_owner",
    roles: ["security_guard"],
  });

  assert.equal(getEffectiveRoleType(admin), "admin");
  assert.equal(getEffectiveRoleType(security), "security");
  assert.equal(getEffectiveRoleType(makeUser()), "resident");
});

test("hasAnyEffectiveRole matches any allowed role", () => {
  const user = makeUser({
    role: "resident_owner",
    roles: ["board_member"],
  });

  assert.equal(hasAnyEffectiveRole(user, ["security_guard", "board_member"]), true);
  assert.equal(hasAnyEffectiveRole(user, ["security_guard", "support_agent"]), false);
});
