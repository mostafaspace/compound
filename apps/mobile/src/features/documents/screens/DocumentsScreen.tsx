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
import { colors, spacing } from "../../../theme";

const statusColors: Record<string, string> = {
  submitted: "#3b82f6",
  under_review: "#f97316",
  approved: "#22c55e",
  rejected: "#ef4444",
  missing: "#6b7280",
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const DocumentsScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
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
      <View style={styles.row}>
        <View style={styles.docInfo}>
          <Typography variant="h3" numberOfLines={1}>
            {item.originalName}
          </Typography>
          <Typography variant="caption" style={{ color: "#9ca3af" }}>
            {formatBytes(item.sizeBytes)}
            {item.createdAt ? ` \u2022 ${new Date(item.createdAt).toLocaleDateString()}` : ""}
          </Typography>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColors[item.status] ?? "#6b7280" }]}>
          <Typography variant="caption" style={styles.badgeText}>
            {t(`Documents.statuses.${item.status}`, { defaultValue: item.status })}
          </Typography>
        </View>
      </View>
      {item.documentType?.name ? (
        <Typography variant="caption" style={{ color: "#6b7280", marginTop: spacing.xs }}>
          {item.documentType.name}
        </Typography>
      ) : null}
      {item.reviewNote ? (
        <Typography variant="caption" style={styles.reviewNote}>
          {item.reviewNote}
        </Typography>
      ) : null}
    </View>
  );

  return (
    <ScreenContainer withKeyboard={false} style={styles.container} edges={["left", "right"]}>
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
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { padding: 0 },
  listContent: { padding: spacing.md, paddingBottom: 100 },
  card: { padding: spacing.md, borderRadius: 12, borderWidth: 1, marginBottom: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  docInfo: { flex: 1, marginRight: spacing.sm },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  reviewNote: { color: "#f97316", marginTop: spacing.xs },
  center: { padding: spacing.xl, alignItems: "center" },
  fabContainer: { position: "absolute", bottom: spacing.xl, left: spacing.md, right: spacing.md },
  fab: { borderRadius: 12 },
});
