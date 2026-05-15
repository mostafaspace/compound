import React, { useRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, useColorScheme, View } from "react-native";
import { colors, radii, spacing, typography } from "../../../theme";
import type { PlateFormat } from "../../../services/apartments/types";
import { useTranslation } from "react-i18next";
import { arabicLettersOnly, digitsOnly } from "../../../utils/numerals";
import { appDirectionStyle, isRtlLanguage, textDirectionStyle } from "../../../i18n/direction";

type Props = {
  format: PlateFormat;
  letters: string;
  digits: string;
  onChange: (next: { format: PlateFormat; letters: string; digits: string }) => void;
};

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
  const { t, i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.language);
  const tint = colors.primary[isDark ? "dark" : "light"];
  const text = colors.text.primary[isDark ? "dark" : "light"];
  const border = colors.border[isDark ? "dark" : "light"];

  const [l1, l2, l3] = splitLetters(letters);
  const ref2 = useRef<TextInput>(null);
  const ref3 = useRef<TextInput>(null);
  const refDigits = useRef<TextInput>(null);

  const updateLetter = (index: 0 | 1 | 2, value: string) => {
    const char = arabicLettersOnly(value, 1);
    if (value && !char) return;

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
    onChange({ format, letters, digits: digitsOnly(value, 5) });
  };

  return (
    <View style={[styles.root, appDirectionStyle(isRtl)]}>
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
      <Text
        style={[
          styles.label,
          { color: text },
          textDirectionStyle(isRtl),
        ]}
      >
        {t("Vehicles.plateNumber")}
      </Text>

      {/* Input fields — RTL arrangement */}
      <View style={styles.inputRow}>
        <TextInput
          ref={refDigits}
          style={[styles.digitInput, { borderColor: border, color: text, writingDirection: "ltr" }]}
          value={digits}
          onChangeText={handleDigits}
          keyboardType="numeric"
          maxLength={5}
          textAlign="center"
        />
        {format === "letters_numbers" ? (
          <>
            <TextInput
              ref={ref3}
              style={[styles.letterInput, { borderColor: border, color: text, writingDirection: "rtl" }]}
              value={l3}
              onChangeText={(t) => updateLetter(2, t)}
              maxLength={1}
              textAlign="center"
            />
            <TextInput
              ref={ref2}
              style={[styles.letterInput, { borderColor: border, color: text, writingDirection: "rtl" }]}
              value={l2}
              onChangeText={(t) => updateLetter(1, t)}
              maxLength={1}
              textAlign="center"
            />
            <TextInput
              style={[styles.letterInput, { borderColor: border, color: text, writingDirection: "rtl" }]}
              value={l1}
              onChangeText={(t) => updateLetter(0, t)}
              maxLength={1}
              textAlign="center"
            />
          </>
        ) : null}
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
    alignSelf: "stretch",
    marginTop: spacing.xs,
  },
  inputRow: {
    direction: "ltr",
    flexDirection: "row",
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
