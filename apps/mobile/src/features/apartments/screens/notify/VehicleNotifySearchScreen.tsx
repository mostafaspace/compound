import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from "react-native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { Button } from "../../../../components/ui/Button";
import { colors, radii, spacing, typography } from "../../../../theme";
import {
  useSearchVehicleMutation,
  useSendVehicleNotificationMutation,
} from "../../../../services/apartments/vehicleNotificationsApi";
import type { RootStackParamList } from "../../../../navigation/types";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "VehicleNotifySearch">;
};

export function VehicleNotifySearchScreen({ navigation }: Props) {
  const isDark = useColorScheme() === "dark";
  const text = colors.text.primary[isDark ? "dark" : "light"];
  const secondary = colors.text.secondary[isDark ? "dark" : "light"];
  const border = colors.border[isDark ? "dark" : "light"];

  const [plate, setPlate] = useState("");
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    recipientCount: number;
    label: string | null;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"identified" | "anonymous">("identified");
  const [alias, setAlias] = useState("");
  const [sent, setSent] = useState(false);

  const [search, { isLoading: searching }] = useSearchVehicleMutation();
  const [send, { isLoading: sending }] = useSendVehicleNotificationMutation();

  const onSearch = async () => {
    const r = await search({ plate }).unwrap();
    setSearchResult({ found: r.found, recipientCount: r.recipientCount, label: r.anonymizedUnitLabel });
  };

  const onSend = async () => {
    await send({
      plate,
      message,
      sender_mode: mode,
      sender_alias: mode === "anonymous" ? alias || undefined : undefined,
    }).unwrap();
    setSent(true);
  };

  if (sent) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={[styles.title, { color: text }]}>Sent!</Text>
        <Text style={[styles.body, { color: secondary }]}>
          Your message has been delivered to the vehicle&apos;s residents.
        </Text>
        <Button title="Done" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={[styles.label, { color: text }]}>Plate number</Text>
      <TextInput
        style={[styles.input, { borderColor: border, color: text }]}
        value={plate}
        onChangeText={(t) => {
          setPlate(t);
          setSearchResult(null);
        }}
        placeholder="أ ب ج 1234"
        placeholderTextColor={secondary}
        textAlign="right"
      />
      <Button
        title={searching ? "Searching..." : "Search"}
        onPress={onSearch}
        disabled={searching || plate.length < 2}
      />

      {searchResult ? (
        <View style={styles.resultSection}>
          {searchResult.found ? (
            <>
              <View style={[styles.resultCard, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
                <Text style={[styles.body, { color: text }]}>
                  Found · {searchResult.recipientCount} recipient(s)
                </Text>
                <Text style={[styles.caption, { color: secondary }]}>{searchResult.label}</Text>
              </View>

              <Text style={[styles.label, { color: text, marginTop: spacing.lg }]}>Message</Text>
              <TextInput
                style={[styles.input, styles.multiline, { borderColor: border, color: text }]}
                value={message}
                onChangeText={setMessage}
                placeholder="Hey, your car is..."
                placeholderTextColor={secondary}
                multiline
                maxLength={1000}
              />

              <Text style={[styles.label, { color: text, marginTop: spacing.md }]}>Send as</Text>
              <View style={styles.modeRow}>
                <Pressable
                  onPress={() => setMode("identified")}
                  style={[
                    styles.modeBtn,
                    {
                      borderColor: border,
                      backgroundColor: mode === "identified" ? colors.primary[isDark ? "dark" : "light"] : "transparent",
                    },
                  ]}
                >
                  <Text style={{ color: mode === "identified" ? "#fff" : text }}>My identity</Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode("anonymous")}
                  style={[
                    styles.modeBtn,
                    {
                      borderColor: border,
                      backgroundColor: mode === "anonymous" ? colors.primary[isDark ? "dark" : "light"] : "transparent",
                    },
                  ]}
                >
                  <Text style={{ color: mode === "anonymous" ? "#fff" : text }}>Anonymous</Text>
                </Pressable>
              </View>

              {mode === "anonymous" ? (
                <TextInput
                  style={[styles.input, { borderColor: border, color: text, marginTop: spacing.sm }]}
                  value={alias}
                  onChangeText={setAlias}
                  placeholder="Your alias (optional)"
                  placeholderTextColor={secondary}
                  maxLength={50}
                />
              ) : null}

              <Button
                title={sending ? "Sending..." : "Send message"}
                onPress={onSend}
                disabled={sending || !message.trim()}
              />
            </>
          ) : (
            <View style={[styles.resultCard, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
              <Text style={[styles.body, { color: text }]}>No vehicle matches that plate in this compound.</Text>
            </View>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: 96,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  label: {
    ...typography.bodyStrong,
  },
  body: {
    ...typography.body,
  },
  caption: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  input: {
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: spacing.sm,
    ...typography.body,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  resultSection: {
    gap: spacing.md,
  },
  resultCard: {
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  modeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modeBtn: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
