import React from "react";
import { FlatList, StyleSheet, View, useColorScheme } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useTranslation } from "react-i18next";
import type { UserDocument } from "@compound/contracts";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { Button } from "../../../components/ui/Button";
import { Typography } from "../../../components/ui/Typography";
import { RootStackParamList } from "../../../navigation/types";
import { useGetDocumentsQuery } from "../../../services/property";
import { colors, layout, radii, shadows, spacing } from "../../../theme";
import { Icon } from "../../../components/ui/Icon";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from "../../../i18n/direction";

const statusTone: Record<string, { background: string; text: string }> = {
  submitted: { background: colors.palette.blue[50], text: colors.palette.blue[700] },
  under_review: { background: colors.palette.amber[50], text: colors.palette.amber[600] },
  approved: { background: colors.palette.emerald[50], text: colors.palette.emerald[600] },
  rejected: { background: colors.palette.red[50], text: colors.palette.red[600] },
  missing: { background: colors.surfaceMuted.light, text: colors.text.secondary.light },
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const DocumentsScreen = () => {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const isRtl = isRtlLanguage(i18n.language);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { data: documents = [], isLoading, refetch } = useGetDocumentsQuery();

  const renderItem = ({ item }: { item: UserDocument }) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.surface.dark : colors.surface.light,
          borderColor: isDark ? colors.border.dark : colors.border.light,
        },
      ]}
    >
      <View style={[styles.row, rowDirectionStyle(isRtl)]}>
        <View style={styles.iconBadge}>
          <Icon name="documents" color={colors.primary.light} size={20} />
        </View>
        <View style={styles.docInfo}>
          <Typography variant="h3" numberOfLines={1} style={textDirectionStyle(isRtl)}>
            {item.originalName}
          </Typography>
          <Typography variant="caption" style={[styles.mutedText, textDirectionStyle(isRtl)]}>
            {formatBytes(item.sizeBytes)}
            {item.createdAt ? ` \u2022 ${new Date(item.createdAt).toLocaleDateString()}` : ""}
          </Typography>
        </View>
        <StatusBadge
          label={t(`Documents.statuses.${item.status}`, { defaultValue: item.status })}
          backgroundColor={(statusTone[item.status] ?? statusTone.missing).background}
          textColor={(statusTone[item.status] ?? statusTone.missing).text}
        />
      </View>
      {item.documentType?.name ? (
        <Typography variant="caption" style={[styles.typeText, textDirectionStyle(isRtl)]}>
          {item.documentType.name}
        </Typography>
      ) : null}
      {item.reviewNote ? (
        <Typography variant="caption" style={[styles.reviewNote, textDirectionStyle(isRtl)]}>
          {item.reviewNote}
        </Typography>
      ) : null}
    </View>
  );

  return (
    <ScreenContainer withKeyboard={false} style={styles.container}>
      <FlatList
        data={documents}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.center}>
            <Typography variant="caption">
              {isLoading ? t("Common.loading") : t("Documents.empty", { defaultValue: "No documents uploaded yet." })}
            </Typography>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
      <View style={styles.fabContainer}>
        <Button
          title={t("Documents.upload", { defaultValue: "Upload Document" })}
          onPress={() => navigation.navigate("UploadDocument")}
          style={styles.fab}
          leftIcon="plus"
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { padding: 0 },
  listContent: { padding: layout.screenGutter, paddingBottom: layout.screenBottom + 72 },
  card: { padding: layout.cardPadding, borderRadius: radii.xl, borderWidth: 1, marginBottom: layout.listGap, ...shadows.sm },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  iconBadge: { width: 40, height: 40, borderRadius: radii.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted.light },
  docInfo: { flex: 1, marginEnd: spacing.sm },
  mutedText: { color: colors.text.secondary.light },
  typeText: { color: colors.text.secondary.light, marginTop: spacing.xs },
  reviewNote: { color: colors.warning, marginTop: spacing.xs },
  center: { padding: spacing.xl, alignItems: "center" },
  fabContainer: { position: "absolute", bottom: layout.fabInset, start: layout.fabInset, end: layout.fabInset },
  fab: { borderRadius: radii.lg },
});
