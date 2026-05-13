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
    <View style={[styles.badge, { backgroundColor: backgroundColor ?? palette.background, borderColor: textColor ?? palette.text }]}>
      <Typography variant="label" style={[styles.text, { color: textColor ?? palette.text }]}>
        {label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: spacing.ms,
    paddingVertical: 4,
    borderWidth: 0.5,
  },
  text: {
    fontSize: 10,
  },
});
