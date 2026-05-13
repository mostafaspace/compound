import React, { useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../components/ui/Button";
import { colors, radii, shadows, spacing, typography } from "../../../../theme";
import { useDeleteResidentMutation } from "../../../../services/apartments/residentsApi";
import type { ApartmentDetail, ApartmentResident } from "../../../../services/apartments/types";
import { ResidentSheet } from "../../components/ResidentSheet";
import { useIsRtl, rowDirectionStyle, textDirectionStyle } from "../../../../i18n/direction";
import { Typography } from "../../../../components/ui/Typography";

export function ResidentsTab({ apartment }: { apartment: ApartmentDetail }) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const isRtl = useIsRtl();
  const [editing, setEditing] = useState<ApartmentResident | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteResident] = useDeleteResidentMutation();

  return (
    <View style={styles.container}>
      <FlatList
        data={apartment.residents}
        keyExtractor={(resident) => String(resident.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={[styles.header, textDirectionStyle(isRtl)]}>
            <Typography variant="h2">{t("Residents.label")}</Typography>
            <Typography variant="body" color="secondary">
              {t("Residents.subtitle")}
            </Typography>
          </View>
        }
        ListEmptyComponent={
          <EmptyState title={t("Residents.noResidents")} body={t("Residents.noResidentsHint")} isRtl={isRtl} />
        }
        renderItem={({ item }) => (
          <ResidentRow
            resident={item}
            isDark={isDark}
            isRtl={isRtl}
            onEdit={() => setEditing(item)}
            onDelete={() => deleteResident({ unitId: apartment.id, residentId: item.id })}
            t={t}
          />
        )}
      />
      <Button title={t("Residents.addResident")} onPress={() => setIsAdding(true)} style={styles.fab} />
      {isAdding ? <ResidentSheet apartment={apartment} onClose={() => setIsAdding(false)} /> : null}
      {editing ? <ResidentSheet apartment={apartment} resident={editing} onClose={() => setEditing(null)} /> : null}
    </View>
  );
}

function ResidentRow({
  resident,
  isDark,
  isRtl,
  onEdit,
  onDelete,
  t,
}: {
  resident: ApartmentResident;
  isDark: boolean;
  isRtl: boolean;
  onEdit: () => void;
  onDelete: () => void;
  t: any;
}) {
  const surface = colors.surface[isDark ? "dark" : "light"];
  const border = colors.border[isDark ? "dark" : "light"];
  const text = colors.text.primary[isDark ? "dark" : "light"];
  const secondary = colors.text.secondary[isDark ? "dark" : "light"];
  const displayName = resident.residentName ?? t("Residents.linkedResident");

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }, rowDirectionStyle(isRtl)]}>
      {resident.photoPath ? <Image source={{ uri: resident.photoPath }} style={styles.avatar} /> : <View style={styles.avatarFallback} />}
      <View style={[styles.cardBody, textDirectionStyle(isRtl)]}>
        <Typography variant="bodyStrong">{displayName}</Typography>
        <Typography variant="caption" color="secondary" style={{ textTransform: "capitalize" }}>
          {t(`Common.relations.${resident.relationType?.toLowerCase()}`)} · {t(`Property.statuses.${resident.verificationStatus?.toLowerCase()}`)}
        </Typography>
        {resident.residentPhone ? <Typography variant="caption" color="secondary">{resident.residentPhone}</Typography> : null}
      </View>
      <View style={[styles.rowActions, { alignItems: isRtl ? "flex-start" : "flex-end" }]}>
        <Pressable onPress={onEdit} style={styles.action}>
          <Typography variant="caption" color="primary">{t("Common.edit")}</Typography>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.action}>
          <Typography variant="caption" style={{ color: colors.error }}>{t("Common.remove")}</Typography>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyState({ title, body, isRtl }: { title: string; body: string; isRtl: boolean }) {
  const isDark = useColorScheme() === "dark";
  const directionStyle = textDirectionStyle(isRtl);

  return (
    <View style={[styles.empty, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }, directionStyle]}>
      <Typography variant="h3">{title}</Typography>
      <Typography variant="body" color="secondary" style={{ marginTop: spacing.xs }}>{body}</Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: 96,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    ...typography.h2,
  },
  subtitle: {
    ...typography.body,
  },
  card: {
    alignItems: "center",
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  avatar: {
    borderRadius: 28,
    height: 56,
    width: 56,
  },
  avatarFallback: {
    backgroundColor: colors.surfaceMuted.light,
    borderRadius: 28,
    height: 56,
    width: 56,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    ...typography.bodyStrong,
  },
  cardMeta: {
    ...typography.caption,
    marginTop: spacing.xxs,
    textTransform: "capitalize",
  },
  rowActions: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  action: {
    minHeight: 44,
    justifyContent: "center",
  },
  actionText: {
    ...typography.caption,
  },
  fab: {
    bottom: spacing.lg,
    start: spacing.md,
    position: "absolute",
    end: spacing.md,
  },
  empty: {
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
  },
  emptyBody: {
    ...typography.body,
    marginTop: spacing.xs,
  },
});
