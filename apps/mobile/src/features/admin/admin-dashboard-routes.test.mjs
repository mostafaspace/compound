import test from "node:test";
import assert from "node:assert/strict";

import {
  getAdminDashboardNavigationTarget,
  getAdminDashboardQuickActions,
} from "./admin-dashboard-routes.ts";

test("profile shortcut routes admins into More settings instead of a missing profile screen", () => {
  assert.deepEqual(getAdminDashboardNavigationTarget("profile"), {
    screen: "More",
    params: { screen: "Settings" },
  });
});

test("polls shortcut routes admins into the More stack poll screen", () => {
  assert.deepEqual(getAdminDashboardNavigationTarget("Polls"), {
    screen: "More",
    params: { screen: "Polls" },
  });
});

test("quick actions expose the production routes expected on the dashboard", () => {
  assert.deepEqual(
    getAdminDashboardQuickActions().map((action) => action.route),
    ["Visitors", "Units", "Finance", "AuditLog", "AdminInvitations", "Polls"]
  );
});
