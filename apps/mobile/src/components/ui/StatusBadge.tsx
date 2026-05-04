import React from "react";
import { StyleSheet, View } from "react-native";

import { spacing } from "../../theme";
import { semanticTonePalette, type SemanticTone } from "../../theme/semantics";
import { Typography } from "./Typography";

type StatusBadgeProps = {
  label: string;
  tone?: SemanticTone;
  backgroundColor?: string;
  textColor?: string;
};

export function StatusBadge({
  label,
  tone = "neutral",
  backgroundColor,
  textColor,
}: StatusBadgeProps) {
  const palette = semanticTonePalette[tone];

  return (
    <View style={[styles.badge, { backgroundColor: backgroundColor ?? palette.background }]}>
      <Typography variant="caption" style={[styles.text, { color: textColor ?? palette.text }]}>
        {label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
  },
});
