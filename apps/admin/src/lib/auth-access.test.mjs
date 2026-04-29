import test from "node:test";
import assert from "node:assert/strict";

import {
  canAccessAdmin,
  formatRoleLabel,
  getEffectiveRoleNames,
  getPrimaryEffectiveRole,
  hasEffectiveRole,
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

test("canAccessAdmin allows active users when effective roles include an allowed admin role", () => {
  const user = makeUser({
    role: "resident_owner",
    roles: ["finance_reviewer"],
  });

  const allowedRoles = ["super_admin", "compound_admin", "finance_reviewer"];

  assert.equal(canAccessAdmin(user, allowedRoles), true);
});

test("canAccessAdmin denies inactive users even when effective roles match", () => {
  const user = makeUser({
    status: "suspended",
    role: "compound_admin",
    roles: ["compound_admin"],
  });

  const allowedRoles = ["compound_admin"];

  assert.equal(canAccessAdmin(user, allowedRoles), false);
});

test("hasEffectiveRole checks both legacy role and RBAC roles array", () => {
  const user = makeUser({
    role: "resident_owner",
    roles: ["compound_admin"],
  });

  assert.equal(hasEffectiveRole(user, "compound_admin"), true);
  assert.equal(hasEffectiveRole(user, "super_admin"), false);
});

test("hasEffectiveRole treats compound_head as the effective admin role alias for compound_admin", () => {
  const user = makeUser({
    role: "resident_owner",
    roles: ["compound_head"],
  });

  assert.equal(hasEffectiveRole(user, "compound_admin"), true);
});

test("getEffectiveRoleNames excludes stale legacy role when explicit roles exist", () => {
  const user = makeUser({
    role: "resident_owner",
    roles: ["compound_head"],
  });

  assert.deepEqual(getEffectiveRoleNames(user), ["compound_head", "compound_admin"]);
});

test("getPrimaryEffectiveRole and formatRoleLabel support truthful operator display", () => {
  const user = makeUser({
    role: "resident_owner",
    roles: ["security_guard"],
  });

  assert.equal(getPrimaryEffectiveRole(user), "security_guard");
  assert.equal(formatRoleLabel(getPrimaryEffectiveRole(user)), "security guard");
});
