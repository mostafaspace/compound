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

export function appendScannerHistoryEntry(
  history: ScannerHistoryEntry[],
  entry: ScannerHistoryEntry,
  limit = 5,
): ScannerHistoryEntry[] {
  return [entry, ...history].slice(0, limit);
}

export type ScannerPreviewState =
  | { mode: "camera"; lens: "back" | "front" }
  | { mode: "fallback"; reason: "no-camera" };

export function getScannerPreviewState(args: {
  hasBackCamera: boolean;
  hasFrontCamera: boolean;
}): ScannerPreviewState {
  if (args.hasBackCamera) {
    return { mode: "camera", lens: "back" };
  }

  if (args.hasFrontCamera) {
    return { mode: "camera", lens: "front" };
  }

  return { mode: "fallback", reason: "no-camera" };
}
