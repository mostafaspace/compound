import type { NotificationCategory } from "@compound/contracts";

function safeAdminPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const path = value.trim();

  if (!path.startsWith("/") || path.startsWith("//")) {
    return null;
  }

  return path;
}

function metadataValue(
  metadata: Record<string, unknown>,
  ...keys: string[]
): string | number | null {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" || typeof value === "number") {
      return value;
    }
  }

  return null;
}

export function getNotificationDeepLink(
  metadata: Record<string, unknown> | undefined | null,
  category: NotificationCategory,
): string | null {
  if (!metadata) {
    return categoryFallbackUrl(category);
  }

  const deepLink = metadata.deep_link ?? metadata.deepLink;
  if (deepLink && typeof deepLink === "object") {
    const web = safeAdminPath((deepLink as Record<string, unknown>).web);
    if (web) {
      return web;
    }
  }

  const actionUrl = safeAdminPath(metadata.actionUrl ?? metadata.action_url ?? metadata.webUrl ?? metadata.web_url);
  if (actionUrl) {
    return actionUrl;
  }

  const pollId = metadataValue(metadata, "poll_id", "pollId");
  if (pollId) return `/polls/${pollId}`;
  const issueId = metadataValue(metadata, "issue_id", "issueId");
  if (issueId) return `/issues/${issueId}`;
  const visitorRequestId = metadataValue(metadata, "visitor_request_id", "visitorRequestId");
  if (visitorRequestId) return "/visitors";
  const announcementId = metadataValue(metadata, "announcement_id", "announcementId");
  if (announcementId) return "/announcements";
  const documentId = metadataValue(metadata, "document_id", "documentId");
  if (documentId) return "/documents";
  const plate = metadataValue(metadata, "plate", "vehicle_plate", "vehiclePlate");
  if (plate) return `/vehicles?q=${encodeURIComponent(String(plate))}`;

  return categoryFallbackUrl(category);
}

function categoryFallbackUrl(category: NotificationCategory): string | null {
  const map: Partial<Record<NotificationCategory, string>> = {
    announcements: "/announcements",
    documents: "/documents",
    finance: "/finance",
    issues: "/issues",
    polls: "/polls",
    vehicles: "/vehicles",
    visitors: "/visitors",
  };

  return map[category] ?? null;
}
