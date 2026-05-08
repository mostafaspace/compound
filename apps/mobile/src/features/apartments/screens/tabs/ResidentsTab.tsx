import React, { useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Button } from "../../../../components/ui/Button";
import { colors, radii, shadows, spacing, typography } from "../../../../theme";
import { useDeleteResidentMutation } from "../../../../services/apartments/residentsApi";
import type { ApartmentDetail, ApartmentResident } from "../../../../services/apartments/types";
import { ResidentSheet } from "../../components/ResidentSheet";

export function ResidentsTab({ apartment }: { apartment: ApartmentDetail }) {
  const isDark = useColorScheme() === "dark";
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
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>Residents</Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
              Verified active residents can manage this unit in v1.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="No residents yet" body="Add family members, tenants, or non-user residents." />
        }
        renderItem={({ item }) => (
          <ResidentRow
            resident={item}
            isDark={isDark}
            onEdit={() => setEditing(item)}
            onDelete={() => deleteResident({ unitId: apartment.id, residentId: item.id })}
          />
        )}
      />
      <Button title="Add resident" onPress={() => setIsAdding(true)} style={styles.fab} />
      {isAdding ? <ResidentSheet apartment={apartment} onClose={() => setIsAdding(false)} /> : null}
      {editing ? <ResidentSheet apartment={apartment} resident={editing} onClose={() => setEditing(null)} /> : null}
    </View>
  );
}

function ResidentRow({
  resident,
  isDark,
  onEdit,
  onDelete,
}: {
  resident: ApartmentResident;
  isDark: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const surface = colors.surface[isDark ? "dark" : "light"];
  const border = colors.border[isDark ? "dark" : "light"];
  const text = colors.text.primary[isDark ? "dark" : "light"];
  const secondary = colors.text.secondary[isDark ? "dark" : "light"];
  const displayName = resident.residentName ?? "Linked resident";

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
      {resident.photoPath ? <Image source={{ uri: resident.photoPath }} style={styles.avatar} /> : <View style={styles.avatarFallback} />}
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: text }]}>{displayName}</Text>
        <Text style={[styles.cardMeta, { color: secondary }]}>
          {resident.relationType} · {resident.verificationStatus}
        </Text>
        {resident.residentPhone ? <Text style={[styles.cardMeta, { color: secondary }]}>{resident.residentPhone}</Text> : null}
      </View>
      <View style={styles.rowActions}>
        <Pressable onPress={onEdit} style={styles.action}>
          <Text style={[styles.actionText, { color: colors.primary[isDark ? "dark" : "light"] }]}>Edit</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.action}>
          <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  const isDark = useColorScheme() === "dark";

  return (
    <View style={[styles.empty, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
      <Text style={[styles.emptyTitle, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>{body}</Text>
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
    left: spacing.md,
    position: "absolute",
    right: spacing.md,
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
