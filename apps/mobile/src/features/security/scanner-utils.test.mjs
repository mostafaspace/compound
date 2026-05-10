import test from "node:test";
import assert from "node:assert/strict";

import {
  appendScannerHistoryEntry,
  getScannerAvailableActions,
  normalizeScannedVisitorToken,
} from "./scanner-utils.ts";

test("normalizeScannedVisitorToken returns direct QR tokens unchanged", () => {
  const token = "abc123def456ghi789jkl012mno345pq678rst901uvw234xyz567";

  assert.equal(normalizeScannedVisitorToken(token), token);
});

test("normalizeScannedVisitorToken extracts token query params from shared URLs", () => {
  const token = "visitor-token-abcdefghijklmnopqrstuvwxyz123456";
  const url = `https://compound.app/visitor-pass?token=${token}`;

  assert.equal(normalizeScannedVisitorToken(url), token);
});

test("normalizeScannedVisitorToken falls back to path segments for deep links", () => {
  const token = "deep-link-token-abcdefghijklmnopqrstuvwxyz123456";
  const url = `compound://visitor/${token}`;

  assert.equal(normalizeScannedVisitorToken(url), token);
});

test("appendScannerHistoryEntry puts newest scans first and caps history", () => {
  const history = Array.from({ length: 4 }, (_value, index) => ({
    id: `old-${index}`,
    status: "valid",
    title: `Old ${index}`,
    detail: "Previous scan",
    scannedAt: `2026-05-05T00:00:0${index}.000Z`,
  }));

  assert.deepEqual(
    appendScannerHistoryEntry(history, {
      id: "new",
      status: "invalid",
      title: "Invalid pass",
      detail: "Expired",
      scannedAt: "2026-05-05T00:01:00.000Z",
    }, 3),
    [
      {
        id: "new",
        status: "invalid",
        title: "Invalid pass",
        detail: "Expired",
        scannedAt: "2026-05-05T00:01:00.000Z",
      },
      history[0],
      history[1],
    ]
  );
});

test("getScannerAvailableActions offers arrive allow and deny for pending valid passes", () => {
  assert.deepEqual(
    getScannerAvailableActions({
      scanResult: "valid",
      visitorStatus: "pending",
    }),
    ["arrive", "allow", "deny"]
  );
});

test("getScannerAvailableActions removes arrive once the visitor is already marked arrived", () => {
  assert.deepEqual(
    getScannerAvailableActions({
      scanResult: "valid",
      visitorStatus: "arrived",
    }),
    ["allow", "deny"]
  );
});

test("getScannerAvailableActions offers complete for already used allowed passes", () => {
  assert.deepEqual(
    getScannerAvailableActions({
      scanResult: "already_used",
      visitorStatus: "allowed",
    }),
    ["complete"]
  );
});
