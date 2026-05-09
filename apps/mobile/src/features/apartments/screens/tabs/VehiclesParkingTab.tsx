import React, { useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Button } from "../../../../components/ui/Button";
import { colors, radii, shadows, spacing, typography } from "../../../../theme";
import { useDeleteVehicleMutation } from "../../../../services/apartments/vehiclesApi";
import { useDeleteParkingSpotMutation } from "../../../../services/apartments/parkingApi";
import type { ApartmentDetail, ApartmentVehicle, ApartmentParkingSpot } from "../../../../services/apartments/types";
import { VehicleSheet } from "../../components/VehicleSheet";
import { ParkingSpotSheet } from "../../components/ParkingSpotSheet";

const MAX = 4;

export function VehiclesParkingTab({ apartment }: { apartment: ApartmentDetail }) {
  const isDark = useColorScheme() === "dark";
  const [vehicleSheet, setVehicleSheet] = useState<{ open: boolean; vehicle?: ApartmentVehicle }>({ open: false });
  const [parkingSheet, setParkingSheet] = useState<{ open: boolean; spot?: ApartmentParkingSpot }>({ open: false });
  const [deleteVehicle] = useDeleteVehicleMutation();
  const [deleteParkingSpot] = useDeleteParkingSpotMutation();

  const text = colors.text.primary[isDark ? "dark" : "light"];
  const secondary = colors.text.secondary[isDark ? "dark" : "light"];
  const surface = colors.surface[isDark ? "dark" : "light"];
  const border = colors.border[isDark ? "dark" : "light"];
  const primary = colors.primary[isDark ? "dark" : "light"];
  const vehiclesAtCap = apartment.vehicles.length >= MAX;
  const parkingAtCap = apartment.parkingSpots.length >= MAX;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {/* ─── Vehicles section ─── */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: text }]}>Vehicles</Text>
          <Text style={[styles.sectionSubtitle, { color: secondary }]}>
            {apartment.vehicles.length}/{MAX}
          </Text>
        </View>
        {vehiclesAtCap ? (
          <Text style={[styles.capWarning, { color: colors.warning }]}>Capacity reached</Text>
        ) : null}
      </View>

      {apartment.vehicles.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: surface }]}>
          <Text style={[styles.emptyTitle, { color: text }]}>No vehicles yet</Text>
          <Text style={[styles.emptyBody, { color: secondary }]}>
            {apartment.unit.hasVehicle ? "Add plate, make, color, and sticker details." : "Vehicles are disabled for this unit."}
          </Text>
        </View>
      ) : (
        apartment.vehicles.map((v) => (
          <View key={v.id} style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{v.plate}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: text }]}>
                {[v.color, v.make, v.model].filter(Boolean).join(" ") || "Vehicle"}
              </Text>
              {v.stickerCode ? <Text style={[styles.cardMeta, { color: secondary }]}>Sticker {v.stickerCode}</Text> : null}
            </View>
            <View style={styles.rowActions}>
              <Pressable onPress={() => setVehicleSheet({ open: true, vehicle: v })} style={styles.action}>
                <Text style={[styles.actionText, { color: primary }]}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => deleteVehicle({ unitId: apartment.id, vehicleId: v.id })} style={styles.action}>
                <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <Button
        title={apartment.unit.hasVehicle ? "Add vehicle" : "Vehicles disabled by admin"}
        onPress={() => setVehicleSheet({ open: true })}
        disabled={!apartment.unit.hasVehicle || vehiclesAtCap}
      />

      {/* ─── Parking section ─── */}
      <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
        <View>
          <Text style={[styles.sectionTitle, { color: text }]}>Parking</Text>
          <Text style={[styles.sectionSubtitle, { color: secondary }]}>
            {apartment.parkingSpots.length}/{MAX}
          </Text>
        </View>
        {parkingAtCap ? (
          <Text style={[styles.capWarning, { color: colors.warning }]}>Capacity reached</Text>
        ) : null}
      </View>

      {apartment.parkingSpots.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: surface }]}>
          <Text style={[styles.emptyTitle, { color: text }]}>No parking spots yet</Text>
          <Text style={[styles.emptyBody, { color: secondary }]}>
            {apartment.unit.hasParking ? "Add assigned spot codes for this unit." : "Parking is disabled for this unit."}
          </Text>
        </View>
      ) : (
        apartment.parkingSpots.map((s) => (
          <View key={s.id} style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
            <View style={styles.spotGlyph}>
              <Text style={styles.spotGlyphText}>P</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: text }]}>{s.code}</Text>
              <Text style={[styles.cardMeta, { color: secondary }]}>{s.notes || "Assigned parking spot"}</Text>
            </View>
            <View style={styles.rowActions}>
              <Pressable onPress={() => setParkingSheet({ open: true, spot: s })} style={styles.action}>
                <Text style={[styles.actionText, { color: primary }]}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => deleteParkingSpot({ unitId: apartment.id, parkingSpotId: s.id })} style={styles.action}>
                <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <Button
        title={apartment.unit.hasParking ? "Add parking spot" : "Parking disabled by admin"}
        onPress={() => setParkingSheet({ open: true })}
        disabled={!apartment.unit.hasParking || parkingAtCap}
      />

      {vehicleSheet.open ? (
        <VehicleSheet
          apartment={apartment}
          vehicle={vehicleSheet.vehicle}
          onClose={() => setVehicleSheet({ open: false })}
        />
      ) : null}
      {parkingSheet.open ? (
        <ParkingSpotSheet
          apartment={apartment}
          parkingSpot={parkingSheet.spot}
          onClose={() => setParkingSheet({ open: false })}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: 96,
  },
  sectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  sectionTitle: {
    ...typography.h2,
  },
  sectionSubtitle: {
    ...typography.body,
  },
  capWarning: {
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
