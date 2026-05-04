import { colors } from "./index";

type Palette = {
  background: string;
  text: string;
};

export type SemanticTone = "success" | "warning" | "danger" | "info" | "neutral";

export const semanticTonePalette: Record<SemanticTone, Palette> = {
  success: { background: "#D1FAE5", text: "#065F46" },
  warning: { background: "#FEF3C7", text: "#92400E" },
  danger: { background: "#FEE2E2", text: "#991B1B" },
  info: { background: "#DBEAFE", text: "#1D4ED8" },
  neutral: { background: "#E2E8F0", text: colors.text.secondary.light },
};

const neutralPalette: Palette = {
  ...semanticTonePalette.neutral,
};

export function issueStatusPalette(status: string): Palette {
  if (status === "resolved" || status === "closed") {
    return semanticTonePalette.success;
  }
  if (status === "escalated") {
    return semanticTonePalette.danger;
  }
  if (status === "in_progress") {
    return semanticTonePalette.info;
  }

  return semanticTonePalette.warning;
}

export function issuePriorityPalette(priority: string): Palette {
  if (priority === "urgent") {
    return semanticTonePalette.danger;
  }
  if (priority === "high") {
    return semanticTonePalette.warning;
  }
  if (priority === "normal") {
    return semanticTonePalette.info;
  }

  return neutralPalette;
}

export function visitorStatusPalette(status: string): Palette {
  if (status === "allowed" || status === "completed") {
    return semanticTonePalette.success;
  }
  if (status === "denied" || status === "cancelled") {
    return semanticTonePalette.danger;
  }
  if (status === "arrived") {
    return semanticTonePalette.info;
  }

  return semanticTonePalette.warning;
}

export function pollStatusPalette(status: string): Palette {
  if (status === "active") {
    return semanticTonePalette.success;
  }
  if (status === "closed") {
    return semanticTonePalette.info;
  }
  if (status === "archived") {
    return semanticTonePalette.neutral;
  }

  return semanticTonePalette.warning;
}
