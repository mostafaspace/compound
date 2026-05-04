const BADGE_TONES = {
  success: "bg-[#e6f3ef] text-brand",
  danger: "bg-[#fff3f2] text-danger",
  info: "bg-[#eaf0ff] text-[#244a8f]",
  warning: "bg-[#f3ead7] text-accent",
  neutral: "bg-background text-muted",
} as const;

export function issueStatusBadgeClass(status: string): string {
  if (status === "resolved" || status === "closed") return BADGE_TONES.success;
  if (status === "escalated") return BADGE_TONES.danger;
  if (status === "in_progress") return BADGE_TONES.info;
  return BADGE_TONES.warning;
}

export function issuePriorityBadgeClass(priority: string): string {
  if (priority === "urgent") return BADGE_TONES.danger;
  if (priority === "high") return BADGE_TONES.warning;
  if (priority === "normal") return BADGE_TONES.info;
  return BADGE_TONES.neutral;
}

export function securityBadgeClass(value: string): string {
  if (value === "active" || value === "allowed") return BADGE_TONES.success;
  if (value === "denied" || value === "emergency" || value === "denied_entry") return BADGE_TONES.danger;
  if (value === "operational_handover") return BADGE_TONES.info;
  if (value === "suspicious_activity") return BADGE_TONES.warning;
  return BADGE_TONES.neutral;
}
