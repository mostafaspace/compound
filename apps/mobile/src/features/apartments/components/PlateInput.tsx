import React from "react";
import { Pressable, StyleSheet, Text, TextInput, useColorScheme, View } from "react-native";
import { colors, radii, spacing, typography } from "../../../theme";
import type { PlateFormat } from "../../../services/apartments/types";

type Props = {
  format: PlateFormat;
  letters: string;
  digits: string;
  onChange: (next: { format: PlateFormat; letters: string; digits: string }) => void;
};

export function PlateInput({ format, letters, digits, onChange }: Props) {
  const isDark = useColorScheme() === "dark";
  const tint = colors.primary[isDark ? "dark" : "light"];
  const text = colors.text.primary[isDark ? "dark" : "light"];
  const border = colors.border[isDark ? "dark" : "light"];

  return (
    <View style={styles.root}>
      {/* Format toggle */}
      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => onChange({ format: "letters_numbers", letters, digits })}
          style={[styles.toggle, { borderColor: border, backgroundColor: format === "letters_numbers" ? tint : "transparent" }]}
        >
          <Text style={{ color: format === "letters_numbers" ? "#fff" : text, ...typography.caption }}>حروف وأرقام</Text>
        </Pressable>
        <Pressable
          onPress={() => onChange({ format: "numbers_only", letters: "", digits })}
          style={[styles.toggle, { borderColor: border, backgroundColor: format === "numbers_only" ? tint : "transparent" }]}
        >
          <Text style={{ color: format === "numbers_only" ? "#fff" : text, ...typography.caption }}>أرقام فقط</Text>
        </Pressable>
      </View>

      {/* Input fields — RTL arrangement */}
      <View style={styles.inputRow}>
        {format === "letters_numbers" ? (
          <TextInput
            style={[styles.input, { flex: 1, borderColor: border, color: text }]}
            placeholder="الحروف"
            placeholderTextColor={colors.text.secondary[isDark ? "dark" : "light"]}
            value={letters}
            onChangeText={(t) => onChange({ format, letters: t, digits })}
            maxLength={20}
            textAlign="right"
          />
        ) : null}
        <TextInput
          style={[styles.input, { flex: 1, borderColor: border, color: text }]}
          placeholder="رقم اللوحة"
          placeholderTextColor={colors.text.secondary[isDark ? "dark" : "light"]}
          value={digits}
          onChangeText={(t) => onChange({ format, letters, digits: t })}
          keyboardType="numeric"
          maxLength={10}
          textAlign="right"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  toggleRow: {
    flexDirection: "row-reverse",
    gap: spacing.sm,
  },
  toggle: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputRow: {
    flexDirection: "row-reverse",
    gap: spacing.sm,
  },
  input: {
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: spacing.sm,
    ...typography.body,
  },
});
