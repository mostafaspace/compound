export function normalizeScannedVisitorToken(rawValue: string | null | undefined): string {
  const value = rawValue?.trim() ?? "";

  if (!value) {
    return "";
  }

  const directMatch = value.match(/[A-Za-z0-9_-]{32,}/);
  if (directMatch && directMatch[0] === value) {
    return directMatch[0];
  }

  try {
    const parsed = new URL(value);
    const tokenParam = parsed.searchParams.get("token") ?? parsed.searchParams.get("qrToken");
    if (tokenParam) {
      return tokenParam.trim();
    }

    const pathnameSegments = parsed.pathname.split("/").filter(Boolean);
    const lastSegment = pathnameSegments.at(-1);
    if (lastSegment && /^[A-Za-z0-9_-]{32,}$/.test(lastSegment)) {
      return lastSegment;
    }
  } catch {
    // Ignore invalid URLs and fall back to token extraction.
  }

  return directMatch?.[0] ?? value;
}

export interface ScannerHistoryEntry {
  id: string;
  status: "valid" | "invalid";
  title: string;
  detail: string;
  scannedAt: string;
}

export type ScannerAction = "arrive" | "allow" | "deny" | "complete";

export function getScannerAvailableActions(args: {
  scanResult: "valid" | "expired" | "already_used" | "denied" | "cancelled" | "not_found" | "out_of_window";
  visitorStatus: "pending" | "qr_issued" | "arrived" | "allowed" | "denied" | "completed" | "cancelled" | null | undefined;
}): ScannerAction[] {
  const { scanResult, visitorStatus } = args;

  if (!visitorStatus) {
    return [];
  }

  if (visitorStatus === "allowed") {
    return scanResult === "valid" || scanResult === "already_used"
      ? ["complete"]
      : [];
  }

  if (scanResult !== "valid") {
    return [];
  }

  if (visitorStatus === "pending" || visitorStatus === "qr_issued") {
    return ["arrive", "allow", "deny"];
  }

  if (visitorStatus === "arrived") {
    return ["allow", "deny"];
  }

  return [];
}

export function appendScannerHistoryEntry(
  history: ScannerHistoryEntry[],
  entry: ScannerHistoryEntry,
  limit = 5,
): ScannerHistoryEntry[] {
  return [entry, ...history].slice(0, limit);
}

