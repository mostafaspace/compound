// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import * as transparency from "./poll-transparency.ts";

test("summarizePollEngagement keeps delivered-not-opened person-level and opened-but-not-voted apartment-level", () => {
  assert.equal(typeof transparency.summarizePollEngagement, "function");

  const summary = transparency.summarizePollEngagement({
    notificationLogs: [
      {
        userId: 10,
        userName: "Owner",
        unitId: "unit-a",
        unitNumber: "A1",
        channel: "in_app",
        notifiedAt: "2026-05-06T00:00:00.000Z",
        delivered: true,
        deliveredAt: "2026-05-06T00:00:00.000Z",
      },
      {
        userId: 11,
        userName: "Spouse",
        unitId: "unit-a",
        unitNumber: "A1",
        channel: "in_app",
        notifiedAt: "2026-05-06T00:00:00.000Z",
        delivered: true,
        deliveredAt: "2026-05-06T00:00:00.000Z",
      },
      {
        userId: 12,
        userName: "Neighbor",
        unitId: "unit-b",
        unitNumber: "B1",
        channel: "in_app",
        notifiedAt: "2026-05-06T00:00:00.000Z",
        delivered: true,
        deliveredAt: "2026-05-06T00:00:00.000Z",
      },
    ],
    viewLogs: [
      {
        userId: 10,
        userName: "Owner",
        unitId: "unit-a",
        unitNumber: "A1",
        firstViewedAt: "2026-05-06T00:05:00.000Z",
        lastViewedAt: "2026-05-06T00:05:00.000Z",
        viewCount: 1,
      },
      {
        userId: 12,
        userName: "Neighbor",
        unitId: "unit-b",
        unitNumber: "B1",
        firstViewedAt: "2026-05-06T00:10:00.000Z",
        lastViewedAt: "2026-05-06T00:10:00.000Z",
        viewCount: 1,
      },
      {
        userId: 99,
        userName: "Admin Viewer",
        unitId: null,
        unitNumber: null,
        firstViewedAt: "2026-05-06T00:12:00.000Z",
        lastViewedAt: "2026-05-06T00:12:00.000Z",
        viewCount: 1,
      },
    ],
    voters: [
      {
        userId: 11,
        userName: "Spouse",
        unitId: "unit-a",
        unitNumber: "A1",
        options: ["Pool hours extension"],
        votedAt: "2026-05-06T00:15:00.000Z",
      },
    ],
  });

  assert.equal(summary.awaitingApartmentVoteCount, 1);
  assert.deepEqual(
    summary.deliveredButNotOpened.map((log) => log.userName),
    ["Spouse"],
  );
  assert.deepEqual(
    summary.openedButApartmentNotVoted.map((log) => log.userName),
    ["Neighbor"],
  );
});
