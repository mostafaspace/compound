import assert from "node:assert/strict";
import test from "node:test";

import { getNotificationDeepLink } from "./notification-links.ts";

test("notification links prefer explicit web action URLs", () => {
  assert.equal(getNotificationDeepLink({ actionUrl: "/polls/poll_123" }, "polls"), "/polls/poll_123");
  assert.equal(getNotificationDeepLink({ deepLink: { web: "/issues/issue_123" } }, "issues"), "/issues/issue_123");
});

test("notification links infer common resource targets", () => {
  assert.equal(getNotificationDeepLink({ visitorRequestId: "vr_123" }, "visitors"), "/visitors");
  assert.equal(getNotificationDeepLink({ vehiclePlate: "ABC 123" }, "vehicles"), "/vehicles?q=ABC%20123");
});

test("notification links reject non-admin URLs", () => {
  assert.equal(getNotificationDeepLink({ actionUrl: "https://example.com/phish" }, "system"), null);
  assert.equal(getNotificationDeepLink({ actionUrl: "javascript:alert(1)" }, "system"), null);
});
