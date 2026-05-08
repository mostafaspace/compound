import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Button } from "../../../../components/ui/Button";
import { colors, radii, shadows, spacing, typography } from "../../../../theme";
import { useDeleteVehicleMutation } from "../../../../services/apartments/vehiclesApi";
import type { ApartmentDetail, ApartmentVehicle } from "../../../../services/apartments/types";
import { VehicleSheet } from "../../components/VehicleSheet";

const MAX_VEHICLES = 4;

export function VehiclesTab({ apartment }: { apartment: ApartmentDetail }) {
  const isDark = useColorScheme() === "dark";
  const [editing, setEditing] = useState<ApartmentVehicle | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteVehicle] = useDeleteVehicleMutation();
  const atCapacity = apartment.vehicles.length >= MAX_VEHICLES;

  return (
    <View style={styles.container}>
      <FlatList
        data={apartment.vehicles}
        keyExtractor={(vehicle) => String(vehicle.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>Vehicles</Text>
              <Text style={[styles.subtitle, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
                Capacity {apartment.vehicles.length}/{MAX_VEHICLES}
              </Text>
            </View>
            {atCapacity ? (
              <Text style={[styles.capacityWarning, { color: colors.warning }]}>Capacity reached</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={<EmptyState title="No vehicles yet" body="Add plate, make, color, and sticker details." />}
        renderItem={({ item }) => (
          <VehicleRow
            vehicle={item}
            isDark={isDark}
            onEdit={() => setEditing(item)}
            onDelete={() => deleteVehicle({ unitId: apartment.id, vehicleId: item.id })}
          />
        )}
      />
      {!atCapacity ? <Button title="Add vehicle" onPress={() => setIsAdding(true)} style={styles.fab} /> : null}
      {isAdding ? <VehicleSheet apartment={apartment} onClose={() => setIsAdding(false)} /> : null}
      {editing ? <VehicleSheet apartment={apartment} vehicle={editing} onClose={() => setEditing(null)} /> : null}
    </View>
  );
}

function VehicleRow({
  vehicle,
  isDark,
  onEdit,
  onDelete,
}: {
  vehicle: ApartmentVehicle;
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
      <View style={styles.plateBadge}>
        <Text style={styles.plateText}>{vehicle.plate}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: text }]}>
          {[vehicle.color, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle"}
        </Text>
        {vehicle.stickerCode ? <Text style={[styles.cardMeta, { color: secondary }]}>Sticker {vehicle.stickerCode}</Text> : null}
        {vehicle.notes ? <Text style={[styles.cardMeta, { color: secondary }]}>{vehicle.notes}</Text> : null}
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
  plateBadge: {
    alignItems: "center",
    backgroundColor: colors.palette.ink[950],
    borderRadius: radii.md,
    justifyContent: "center",
    minHeight: 52,
    minWidth: 92,
    paddingHorizontal: spacing.sm,
  },
  plateText: {
    ...typography.caption,
    color: colors.text.inverse,
    letterSpacing: 1,
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
