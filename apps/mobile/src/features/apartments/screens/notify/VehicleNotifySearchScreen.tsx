import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { StackNavigationProp } from "@react-navigation/stack";
import { Button } from "../../../../components/ui/Button";
import { colors, radii, spacing, typography } from "../../../../theme";
import {
  useSearchVehicleMutation,
  useSendVehicleNotificationMutation,
} from "../../../../services/apartments/vehicleNotificationsApi";
import type { RootStackParamList } from "../../../../navigation/types";
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from "../../../../i18n/direction";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "VehicleNotifySearch">;
};

export function VehicleNotifySearchScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const isRtl = isRtlLanguage(i18n.language);
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
      <View style={[styles.container, styles.center, textDirectionStyle(isRtl)]}>
        <Text style={[styles.title, { color: text }, textDirectionStyle(isRtl)]}>{t("VehicleNotify.sent")}</Text>
        <Text style={[styles.body, { color: secondary }, textDirectionStyle(isRtl)]}>
          {t("VehicleNotify.sentBody")}
        </Text>
        <Button title={t("Common.done")} onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={[styles.label, { color: text }, textDirectionStyle(isRtl)]}>{t("VehicleNotify.plateNumber")}</Text>
      <TextInput
        style={[styles.input, { borderColor: border, color: text }, textDirectionStyle(isRtl)]}
        value={plate}
        onChangeText={(v) => {
          setPlate(v);
          setSearchResult(null);
        }}
        placeholder={t("VehicleNotify.platePlaceholder")}
        placeholderTextColor={secondary}
        textAlign={isRtl ? "right" : "left"}
      />
      <Button
        title={searching ? t("VehicleNotify.searching") : t("VehicleNotify.search")}
        onPress={onSearch}
        disabled={searching || plate.length < 2}
      />

      {searchResult ? (
        <View style={styles.resultSection}>
          {searchResult.found ? (
            <>
              <View style={[styles.resultCard, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
                <Text style={[styles.body, { color: text }, textDirectionStyle(isRtl)]}>
                  {t("VehicleNotify.foundCount", { count: searchResult.recipientCount })}
                </Text>
                <Text style={[styles.caption, { color: secondary }, textDirectionStyle(isRtl)]}>{searchResult.label}</Text>
              </View>

              <Text style={[styles.label, { color: text, marginTop: spacing.lg }, textDirectionStyle(isRtl)]}>{t("VehicleNotify.messageLabel")}</Text>
              <TextInput
                style={[styles.input, styles.multiline, { borderColor: border, color: text }, textDirectionStyle(isRtl)]}
                value={message}
                onChangeText={setMessage}
                placeholder={t("VehicleNotify.messagePlaceholder")}
                placeholderTextColor={secondary}
                multiline
                maxLength={1000}
                textAlign={isRtl ? "right" : "left"}
              />

              <Text style={[styles.label, { color: text, marginTop: spacing.md }, textDirectionStyle(isRtl)]}>{t("VehicleNotify.sendAs")}</Text>
              <View style={[styles.modeRow, rowDirectionStyle(isRtl)]}>
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
                  <Text style={[{ color: mode === "identified" ? "#fff" : text }, textDirectionStyle(isRtl)]}>{t("VehicleNotify.myIdentity")}</Text>
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
                  <Text style={[{ color: mode === "anonymous" ? "#fff" : text }, textDirectionStyle(isRtl)]}>{t("VehicleNotify.anonymous")}</Text>
                </Pressable>
              </View>

              {mode === "anonymous" ? (
                <TextInput
                  style={[styles.input, { borderColor: border, color: text, marginTop: spacing.sm }, textDirectionStyle(isRtl)]}
                  value={alias}
                  onChangeText={setAlias}
                  placeholder={t("VehicleNotify.aliasPlaceholder")}
                  placeholderTextColor={secondary}
                  maxLength={50}
                  textAlign={isRtl ? "right" : "left"}
                />
              ) : null}

              <Button
                title={sending ? t("VehicleNotify.sending") : t("VehicleNotify.sendMessage")}
                onPress={onSend}
                disabled={sending || !message.trim()}
              />
            </>
          ) : (
            <View style={[styles.resultCard, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
              <Text style={[styles.body, { color: text }, textDirectionStyle(isRtl)]}>{t("VehicleNotify.noMatch")}</Text>
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
