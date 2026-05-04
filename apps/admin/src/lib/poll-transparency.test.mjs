import assert from "node:assert/strict";
import test from "node:test";

import {
  groupVoteSelections,
  summarizePollTransparency,
  summarizeVoteTransparency,
} from "./poll-transparency.ts";

test("summarizePollTransparency derives delivery and readership proof from backend logs", () => {
  const summary = summarizePollTransparency({
    publishedAt: "2026-05-04T09:00:00.000Z",
    closedAt: "2026-05-04T18:00:00.000Z",
    votesCount: 3,
    voters: [
      { userId: 11, userName: "A", unitId: "u1", unitNumber: "101", options: ["Yes"], votedAt: "2026-05-04T10:00:00.000Z" },
      { userId: 12, userName: "B", unitId: "u2", unitNumber: "102", options: ["No"], votedAt: "2026-05-04T11:00:00.000Z" },
      { userId: 12, userName: "B", unitId: "u2", unitNumber: "102", options: ["No"], votedAt: "2026-05-04T11:05:00.000Z" },
    ],
    notificationLogs: [
      { userName: "A", notifiedAt: "2026-05-04T09:01:00.000Z", delivered: true },
      { userName: "B", notifiedAt: "2026-05-04T09:02:00.000Z", delivered: false },
      { userName: "C", notifiedAt: "2026-05-04T09:03:00.000Z", delivered: true },
    ],
    viewLogs: [
      { userName: "A", firstViewedAt: "2026-05-04T09:05:00.000Z", lastViewedAt: "2026-05-04T09:20:00.000Z", viewCount: 2 },
      { userName: "B", firstViewedAt: "2026-05-04T09:10:00.000Z", lastViewedAt: "2026-05-04T09:10:00.000Z", viewCount: 1 },
    ],
  });

  assert.equal(summary.totalNotifications, 3);
  assert.equal(summary.deliveredNotifications, 2);
  assert.equal(summary.deliveryRate, 67);
  assert.equal(summary.totalViews, 3);
  assert.equal(summary.uniqueViewers, 2);
  assert.equal(summary.averageViewsPerViewer, "1.5");
  assert.equal(summary.uniqueVoterCount, 2);
  assert.equal(summary.uniqueUnitCount, 2);
  assert.equal(summary.firstPublicationAt, "2026-05-04T09:00:00.000Z");
  assert.equal(summary.latestActivityAt, "2026-05-04T18:00:00.000Z");
});

test("summarizeVoteTransparency reports anonymity guardrails and participation footprint", () => {
  const summary = summarizeVoteTransparency(
    {
      isAnonymous: false,
      requiresDocCompliance: true,
      participationsCount: 4,
      resultAppliedAt: "2026-05-04T18:30:00.000Z",
    },
    [
      { userId: 11, userName: "A", unitId: "u1", unitNumber: "101", optionId: 1, option: "Approve", votedAt: "2026-05-04T10:00:00.000Z" },
      { userId: 12, userName: "B", unitId: "u2", unitNumber: "102", optionId: 1, option: "Approve", votedAt: "2026-05-04T10:10:00.000Z" },
      { userId: 12, userName: "B", unitId: "u2", unitNumber: "102", optionId: 2, option: "Reject", votedAt: "2026-05-04T10:12:00.000Z" },
      { userId: 13, userName: "C", unitId: null, unitNumber: null, optionId: 1, option: "Approve", votedAt: null },
    ],
  );

  assert.equal(summary.transparencyMode, "named_ballots");
  assert.equal(summary.docComplianceMode, "required");
  assert.equal(summary.totalBallots, 4);
  assert.equal(summary.uniqueVoterCount, 3);
  assert.equal(summary.uniqueUnitCount, 2);
  assert.equal(summary.latestParticipationAt, "2026-05-04T10:12:00.000Z");
  assert.equal(summary.resultAppliedAt, "2026-05-04T18:30:00.000Z");
});

test("summarizeVoteTransparency degrades cleanly when anonymous votes hide the voter ledger", () => {
  const summary = summarizeVoteTransparency(
    {
      isAnonymous: true,
      requiresDocCompliance: false,
      participationsCount: 7,
      resultAppliedAt: null,
    },
    null,
  );

  assert.equal(summary.transparencyMode, "anonymous_ballots");
  assert.equal(summary.docComplianceMode, "not_required");
  assert.equal(summary.totalBallots, 7);
  assert.equal(summary.uniqueVoterCount, null);
  assert.equal(summary.uniqueUnitCount, null);
  assert.equal(summary.latestParticipationAt, null);
});

test("groupVoteSelections collapses multiple rows per voter into one admin ledger row", () => {
  const grouped = groupVoteSelections([
    { userId: 11, userName: "A", unitId: "u1", unitNumber: "101", optionId: 1, option: "Approve", votedAt: "2026-05-04T10:00:00.000Z" },
    { userId: 11, userName: "A", unitId: "u1", unitNumber: "101", optionId: 2, option: "Budget", votedAt: "2026-05-04T10:01:00.000Z" },
    { userId: 12, userName: "B", unitId: null, unitNumber: null, optionId: 3, option: null, votedAt: null },
  ]);

  assert.equal(grouped.length, 2);
  assert.deepEqual(grouped[0].selections, ["Approve", "Budget"]);
  assert.equal(grouped[0].votedAt, "2026-05-04T10:01:00.000Z");
  assert.deepEqual(grouped[1].selections, []);
});
