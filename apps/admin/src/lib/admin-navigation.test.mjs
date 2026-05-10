import assert from "node:assert/strict";
import test from "node:test";

import {
  getAdminSections,
  getCompoundAdminLoginDestination,
  shouldShowCompoundContext,
} from "./admin-navigation.ts";

test("compound admins land on command center instead of compound detail", () => {
  assert.equal(getCompoundAdminLoginDestination(), "/");
});

test("compound admins do not see compound context banners", () => {
  assert.equal(shouldShowCompoundContext({ roles: ["compound_admin"] }), false);
  assert.equal(shouldShowCompoundContext({ roles: ["super_admin"] }), true);
});

test("compound admins get neutral property navigation", () => {
  const sections = getAdminSections({ roles: ["compound_admin"] });
  assert.equal(sections.some((section) => section.label === "Compounds"), false);
  assert.equal(sections.some((section) => section.label === "Apartments"), true);
});
