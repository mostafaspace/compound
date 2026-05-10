import React, { useRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, useColorScheme, View } from "react-native";
import { colors, radii, spacing, typography } from "../../../theme";
import type { PlateFormat } from "../../../services/apartments/types";
import { useTranslation } from "react-i18next";

type Props = {
  format: PlateFormat;
  letters: string;
  digits: string;
  onChange: (next: { format: PlateFormat; letters: string; digits: string }) => void;
};

const ARABIC_LETTER_RE = /^[ء-ي]$/;
const ARABIC_DIGIT_RE = /^[٠-٩۰-۹\d]$/;

/**
 * Split stored "أ ب ج" into array of 3 single chars.
 * Spaces separate individual letters in the stored format.
 */
function splitLetters(stored: string): [string, string, string] {
  const parts = stored.split(" ").filter(Boolean);
  return [parts[0] ?? "", parts[1] ?? "", parts[2] ?? ""];
}

function joinLetters(arr: [string, string, string]): string {
  return arr.filter(Boolean).join(" ");
}

export function PlateInput({ format, letters, digits, onChange }: Props) {
  const isDark = useColorScheme() === "dark";
  const { t } = useTranslation();
  const tint = colors.primary[isDark ? "dark" : "light"];
  const text = colors.text.primary[isDark ? "dark" : "light"];
  const border = colors.border[isDark ? "dark" : "light"];
  const placeholder = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";

  const [l1, l2, l3] = splitLetters(letters);
  const ref2 = useRef<TextInput>(null);
  const ref3 = useRef<TextInput>(null);
  const refDigits = useRef<TextInput>(null);

  const updateLetter = (index: 0 | 1 | 2, value: string) => {
    // Only allow Arabic letters
    const char = value.slice(-1);
    if (char && !ARABIC_LETTER_RE.test(char)) return;

    const arr: [string, string, string] = [l1, l2, l3];
    arr[index] = char;
    onChange({ format, letters: joinLetters(arr), digits });

    // Auto-advance to next input
    if (char) {
      if (index === 0) ref2.current?.focus();
      else if (index === 1) ref3.current?.focus();
      else refDigits.current?.focus();
    }
  };

  const handleDigits = (value: string) => {
    // Only allow Arabic-Indic digits and Latin digits, max 5
    const filtered = value
      .split("")
      .filter((ch) => ARABIC_DIGIT_RE.test(ch))
      .slice(0, 5)
      .join("");
    onChange({ format, letters, digits: filtered });
  };

  return (
    <View style={styles.root}>
      {/* Format toggle */}
      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => onChange({ format: "letters_numbers", letters, digits })}
          style={[styles.toggle, { borderColor: border, backgroundColor: format === "letters_numbers" ? tint : "transparent" }]}
        >
          <Text style={{ color: format === "letters_numbers" ? "#fff" : text, ...typography.caption, textAlign: "center" }}>
            {t("Vehicles.lettersNumbers")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onChange({ format: "numbers_only", letters: "", digits })}
          style={[styles.toggle, { borderColor: border, backgroundColor: format === "numbers_only" ? tint : "transparent" }]}
        >
          <Text style={{ color: format === "numbers_only" ? "#fff" : text, ...typography.caption, textAlign: "center" }}>
            {t("Vehicles.numbersOnly")}
          </Text>
        </Pressable>
      </View>

      {/* Plate label */}
      <Text style={[styles.label, { color: text }]}>{t("Vehicles.plateNumber")}</Text>

      {/* Input fields — RTL arrangement */}
      <View style={styles.inputRow}>
        {format === "letters_numbers" ? (
          <>
            <TextInput
              style={[styles.letterInput, { borderColor: border, color: text }]}
              value={l1}
              onChangeText={(t) => updateLetter(0, t)}
              maxLength={1}
              textAlign="center"
            />
            <TextInput
              ref={ref2}
              style={[styles.letterInput, { borderColor: border, color: text }]}
              value={l2}
              onChangeText={(t) => updateLetter(1, t)}
              maxLength={1}
              textAlign="center"
            />
            <TextInput
              ref={ref3}
              style={[styles.letterInput, { borderColor: border, color: text }]}
              value={l3}
              onChangeText={(t) => updateLetter(2, t)}
              maxLength={1}
              textAlign="center"
            />
          </>
        ) : null}
        <TextInput
          ref={refDigits}
          style={[styles.digitInput, { borderColor: border, color: text }]}
          value={digits}
          onChangeText={handleDigits}
          keyboardType="numeric"
          maxLength={5}
          textAlign="center"
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
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.label,
    marginTop: spacing.xs,
  },
  inputRow: {
    flexDirection: "row-reverse",
    gap: spacing.sm,
  },
  letterInput: {
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: spacing.sm,
    flex: 1,
    ...typography.h3,
  },
  digitInput: {
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: spacing.sm,
    flex: 2,
    ...typography.h3,
  },
});
