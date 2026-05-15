import test from "node:test";
import assert from "node:assert/strict";

import { resolveDashboardShortcutTarget } from "./dashboard-navigation.ts";

test("resident poll shortcuts route through the More stack when no Polls tab is mounted", () => {
  assert.deepEqual(resolveDashboardShortcutTarget("/polls"), {
    navigator: "tab",
    screen: "More",
    params: { screen: "Polls", initial: false },
  });

  assert.deepEqual(resolveDashboardShortcutTarget("/governance"), {
    navigator: "tab",
    screen: "More",
    params: { screen: "Polls", initial: false },
  });
});

test("resident org chart shortcut routes through the More stack", () => {
  assert.deepEqual(resolveDashboardShortcutTarget("/org-chart"), {
    navigator: "tab",
    screen: "More",
    params: { screen: "OrgChart", initial: false },
  });
});

test("root shortcuts target the parent stack", () => {
  assert.deepEqual(resolveDashboardShortcutTarget("/visitors/create"), {
    navigator: "root",
    screen: "CreateVisitor",
    params: undefined,
  });
});
