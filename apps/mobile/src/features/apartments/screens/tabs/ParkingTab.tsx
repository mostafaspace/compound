import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Button } from "../../../../components/ui/Button";
import { colors, radii, shadows, spacing, typography } from "../../../../theme";
import { useDeleteParkingSpotMutation } from "../../../../services/apartments/parkingApi";
import type { ApartmentDetail, ApartmentParkingSpot } from "../../../../services/apartments/types";
import { ParkingSpotSheet } from "../../components/ParkingSpotSheet";

const MAX_PARKING_SPOTS = 4;

export function ParkingTab({ apartment }: { apartment: ApartmentDetail }) {
  const isDark = useColorScheme() === "dark";
  const [editing, setEditing] = useState<ApartmentParkingSpot | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteParkingSpot] = useDeleteParkingSpotMutation();
  const atCapacity = apartment.parkingSpots.length >= MAX_PARKING_SPOTS;

  return (
    <View style={styles.container}>
      <FlatList
        data={apartment.parkingSpots}
        keyExtractor={(spot) => String(spot.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>Parking</Text>
              <Text style={[styles.subtitle, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
                Capacity {apartment.parkingSpots.length}/{MAX_PARKING_SPOTS}
              </Text>
            </View>
            {atCapacity ? (
              <Text style={[styles.capacityWarning, { color: colors.warning }]}>Capacity reached</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={<EmptyState title="No parking spots yet" body="Add assigned spot codes for this unit." />}
        renderItem={({ item }) => (
          <ParkingRow
            spot={item}
            isDark={isDark}
            onEdit={() => setEditing(item)}
            onDelete={() => deleteParkingSpot({ unitId: apartment.id, parkingSpotId: item.id })}
          />
        )}
      />
      {!atCapacity ? <Button title="Add parking spot" onPress={() => setIsAdding(true)} style={styles.fab} /> : null}
      {isAdding ? <ParkingSpotSheet apartment={apartment} onClose={() => setIsAdding(false)} /> : null}
      {editing ? <ParkingSpotSheet apartment={apartment} parkingSpot={editing} onClose={() => setEditing(null)} /> : null}
    </View>
  );
}

function ParkingRow({
  spot,
  isDark,
  onEdit,
  onDelete,
}: {
  spot: ApartmentParkingSpot;
  isDark: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const surface = colors.surface[isDark ? "dark" : "light"];
  const border = colors.border[isDark ? "dark" : "light"];
  const text = colors.text.primary[isDark ? "dark" : "light"];
  const secondary = colors.text.secondary[isDark ? "dark" : "light"];

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
      <View style={styles.spotGlyph}>
        <Text style={styles.spotGlyphText}>P</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: text }]}>{spot.code}</Text>
        <Text style={[styles.cardMeta, { color: secondary }]}>{spot.notes || "Assigned parking spot"}</Text>
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
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  title: {
    ...typography.h2,
  },
  subtitle: {
    ...typography.body,
  },
  capacityWarning: {
    ...typography.caption,
    minHeight: 44,
    paddingTop: spacing.sm,
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
  spotGlyph: {
    alignItems: "center",
    backgroundColor: colors.palette.teal[700],
    borderRadius: radii.lg,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  spotGlyphText: {
    ...typography.h3,
    color: colors.text.inverse,
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
