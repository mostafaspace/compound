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
  assert.equal(sections.some((section) => section.labelKey === "compounds"), false);
  assert.equal(sections.some((section) => section.labelKey === "launch"), false);
  assert.equal(sections.some((section) => section.labelKey === "roles"), false);
  assert.equal(sections.some((section) => section.labelKey === "permissions"), false);
  assert.equal(sections.some((section) => section.labelKey === "units"), true);
});

test("admin navigation exposes the major admin workspaces", () => {
  const sections = getAdminSections({ roles: ["super_admin"], permissions: ["lookup_vehicles"] });
  const hrefs = new Set(sections.map((section) => section.href));

  [
    "/analytics/operational",
    "/documents",
    "/document-reviews",
    "/issues",
    "/work-orders",
    "/visitors",
    "/org-chart",
    "/security/gates",
    "/support/users",
    "/settings/roles",
  ].forEach((href) => assert.equal(hrefs.has(href), true, href));
});

test("admin navigation keeps subpages under parent workspaces", () => {
  const sections = getAdminSections({ roles: ["super_admin"], permissions: ["lookup_vehicles"] });

  [
    ["/document-reviews", "/documents"],
    ["/finance/advanced", "/finance"],
    ["/meetings/action-items", "/meetings"],
    ["/polls/types", "/polls"],
    ["/representative-assignments", "/org-chart"],
    ["/security/admin-activity", "/security"],
    ["/support/merges", "/support/users"],
    ["/settings/roles", "/settings"],
    ["/violation-rules", "/settings"],
  ].forEach(([href, parentHref]) => {
    const section = sections.find((item) => item.href === href);
    assert.equal(section?.parentHref, parentHref, href);
    assert.equal(section?.sidebar, undefined, href);
  });
});
