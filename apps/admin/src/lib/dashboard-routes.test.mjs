import assert from "node:assert/strict";
import test from "node:test";

import { resolveDashboardRoute } from "./dashboard-routes.ts";

test("resolveDashboardRoute keeps valid admin routes intact", () => {
  assert.equal(resolveDashboardRoute("/issues?status=open"), "/issues?status=open");
  assert.equal(resolveDashboardRoute("/units/assign"), "/units/assign");
  assert.equal(resolveDashboardRoute("/vehicles?q=ABC"), "/vehicles?q=ABC");
  assert.equal(resolveDashboardRoute("/security/admin-activity"), "/security/admin-activity");
});

test("resolveDashboardRoute remaps known backend aliases to real admin pages", () => {
  assert.equal(resolveDashboardRoute("/polls/create"), "/polls/new");
  assert.equal(
    resolveDashboardRoute("/org-chart", { activeCompoundId: "cmp_123" }),
    "/compounds/cmp_123/org-chart",
  );
  assert.equal(resolveDashboardRoute("/security/manual-entry"), "/security/manual-entries");
});

test("resolveDashboardRoute drops routes that do not have a safe admin destination", () => {
  assert.equal(resolveDashboardRoute("/org-chart"), null);
  assert.equal(resolveDashboardRoute("/users/invite"), null);
  assert.equal(resolveDashboardRoute("/security/scanner"), null);
  assert.equal(resolveDashboardRoute("/totally-unknown"), null);
});
