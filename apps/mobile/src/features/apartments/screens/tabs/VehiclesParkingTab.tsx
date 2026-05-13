import React, { useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../components/ui/Button";
import { colors, radii, shadows, spacing, typography } from "../../../../theme";
import { useDeleteVehicleMutation } from "../../../../services/apartments/vehiclesApi";
import { useDeleteParkingSpotMutation } from "../../../../services/apartments/parkingApi";
import type { ApartmentDetail, ApartmentVehicle, ApartmentParkingSpot } from "../../../../services/apartments/types";
import { VehicleSheet } from "../../components/VehicleSheet";
import { ParkingSpotSheet } from "../../components/ParkingSpotSheet";
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from "../../../../i18n/direction";

const MAX = 4;

export function VehiclesParkingTab({ apartment }: { apartment: ApartmentDetail }) {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const isRtl = isRtlLanguage(i18n.language);
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

  const renderVehicle = ({ item: v }: { item: ApartmentVehicle }) => (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }, rowDirectionStyle(isRtl)]}>
      <View style={styles.plateBadge}>
        <Text style={styles.plateText}>{v.plate}</Text>
      </View>
      <View style={[styles.cardBody, textDirectionStyle(isRtl)]}>
        <Text style={[styles.cardTitle, { color: text }, textDirectionStyle(isRtl)]}>
          {[v.color, v.make, v.model].filter(Boolean).join(" ") || t("Vehicles.vehicle")}
        </Text>
        {v.stickerCode ? <Text style={[styles.cardMeta, { color: secondary }, textDirectionStyle(isRtl)]}>{t("Vehicles.sticker", { code: v.stickerCode })}</Text> : null}
      </View>
      <View style={[styles.rowActions, { alignItems: isRtl ? "flex-start" : "flex-end" }]}>
        <Pressable onPress={() => setVehicleSheet({ open: true, vehicle: v })} style={styles.action}>
          <Text style={[styles.actionText, { color: primary }, textDirectionStyle(isRtl)]}>{t("Common.edit")}</Text>
        </Pressable>
        <Pressable onPress={() => deleteVehicle({ unitId: apartment.id, vehicleId: v.id })} style={styles.action}>
          <Text style={[styles.actionText, { color: colors.error }, textDirectionStyle(isRtl)]}>{t("Common.remove")}</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderParkingSpot = ({ item: s }: { item: ApartmentParkingSpot }) => (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }, rowDirectionStyle(isRtl)]}>
      <View style={styles.spotGlyph}>
        <Text style={styles.spotGlyphText}>P</Text>
      </View>
      <View style={[styles.cardBody, textDirectionStyle(isRtl)]}>
        <Text style={[styles.cardTitle, { color: text }, textDirectionStyle(isRtl)]}>{s.code}</Text>
        <Text style={[styles.cardMeta, { color: secondary }, textDirectionStyle(isRtl)]}>{s.notes || t("Parking.assignedParking")}</Text>
      </View>
      <View style={[styles.rowActions, { alignItems: isRtl ? "flex-start" : "flex-end" }]}>
        <Pressable onPress={() => setParkingSheet({ open: true, spot: s })} style={styles.action}>
          <Text style={[styles.actionText, { color: primary }, textDirectionStyle(isRtl)]}>{t("Common.edit")}</Text>
        </Pressable>
        <Pressable onPress={() => deleteParkingSpot({ unitId: apartment.id, parkingSpotId: s.id })} style={styles.action}>
          <Text style={[styles.actionText, { color: colors.error }, textDirectionStyle(isRtl)]}>{t("Common.remove")}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {/* ─── Vehicles section ─── */}
      <View style={[styles.sectionHeader, rowDirectionStyle(isRtl)]}>
        <View style={textDirectionStyle(isRtl)}>
          <Text style={[styles.sectionTitle, { color: text }, textDirectionStyle(isRtl)]}>{t("Vehicles.addVehicle")}</Text>
          <Text style={[styles.sectionSubtitle, { color: secondary }, textDirectionStyle(isRtl)]}>
            {isRtl ? `${MAX}/${apartment.vehicles.length}` : `${apartment.vehicles.length}/${MAX}`}
          </Text>
        </View>
        {vehiclesAtCap ? (
          <Text style={[styles.capWarning, { color: colors.warning }, textDirectionStyle(isRtl)]}>{t("Vehicles.capacityReached")}</Text>
        ) : null}
      </View>

      {apartment.vehicles.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: surface }, textDirectionStyle(isRtl)]}>
          <Text style={[styles.emptyTitle, { color: text }, textDirectionStyle(isRtl)]}>{t("Vehicles.noVehicles")}</Text>
          <Text style={[styles.emptyBody, { color: secondary }, textDirectionStyle(isRtl)]}>
            {t("Vehicles.addVehicleHint")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={apartment.vehicles}
          keyExtractor={(vehicle) => String(vehicle.id)}
          renderItem={renderVehicle}
          scrollEnabled={false}
        />
      )}

      <Button
        title={vehiclesAtCap ? t("Vehicles.vehicleAtCapacity") : t("Vehicles.addVehicle")}
        onPress={() => setVehicleSheet({ open: true })}
        disabled={vehiclesAtCap}
      />

      {/* ─── Parking section ─── */}
      <View style={[styles.sectionHeader, { marginTop: spacing.xl }, rowDirectionStyle(isRtl)]}>
        <View style={textDirectionStyle(isRtl)}>
          <Text style={[styles.sectionTitle, { color: text }, textDirectionStyle(isRtl)]}>{t("Parking.label")}</Text>
          <Text style={[styles.sectionSubtitle, { color: secondary }, textDirectionStyle(isRtl)]}>
            {isRtl ? `${MAX}/${apartment.parkingSpots.length}` : `${apartment.parkingSpots.length}/${MAX}`}
          </Text>
        </View>
        {parkingAtCap ? (
          <Text style={[styles.capWarning, { color: colors.warning }, textDirectionStyle(isRtl)]}>{t("Vehicles.capacityReached")}</Text>
        ) : null}
      </View>

      {apartment.parkingSpots.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: surface }, textDirectionStyle(isRtl)]}>
          <Text style={[styles.emptyTitle, { color: text }, textDirectionStyle(isRtl)]}>{t("Parking.noParking")}</Text>
          <Text style={[styles.emptyBody, { color: secondary }, textDirectionStyle(isRtl)]}>
            {apartment.unit.hasParking ? t("Parking.addParkingHint") : t("Parking.parkingDisabled")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={apartment.parkingSpots}
          keyExtractor={(spot) => String(spot.id)}
          renderItem={renderParkingSpot}
          scrollEnabled={false}
        />
      )}

      <Button
        title={apartment.unit.hasParking ? t("Parking.addParking") : t("Parking.parkingDisabledByAdmin")}
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
