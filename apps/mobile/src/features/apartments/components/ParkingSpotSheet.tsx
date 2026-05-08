import React, { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { colors, radii, shadows, spacing, typography } from "../../../theme";
import { useCreateParkingSpotMutation, useUpdateParkingSpotMutation } from "../../../services/apartments/parkingApi";
import type { ApartmentDetail, ApartmentParkingSpot } from "../../../services/apartments/types";

export function ParkingSpotSheet({
  apartment,
  parkingSpot,
  onClose,
}: {
  apartment: ApartmentDetail;
  parkingSpot?: ApartmentParkingSpot;
  onClose: () => void;
}) {
  const isDark = useColorScheme() === "dark";
  const [code, setCode] = useState(parkingSpot?.code ?? "");
  const [notes, setNotes] = useState(parkingSpot?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [createParkingSpot, createState] = useCreateParkingSpotMutation();
  const [updateParkingSpot, updateState] = useUpdateParkingSpotMutation();
  const isSaving = createState.isLoading || updateState.isLoading;

  const submit = async () => {
    if (!code.trim()) {
      setError("Spot code is required.");
      return;
    }

    setError(null);

    const body = {
      code: code.trim(),
      notes: notes.trim() || null,
    };

    try {
      if (parkingSpot) {
        await updateParkingSpot({ unitId: apartment.id, parkingSpotId: parkingSpot.id, body }).unwrap();
      } else {
        await createParkingSpot({ unitId: apartment.id, body }).unwrap();
      }

      onClose();
    } catch {
      setError("Could not save parking spot. Please try again.");
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.handle} />
            <Text style={[styles.title, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
              {parkingSpot ? "Edit parking" : "Add parking"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
              Parking capacity is capped at 4 per unit.
            </Text>

            <Input label="Spot code" value={code} onChangeText={setCode} placeholder="B2-17" autoCapitalize="characters" error={error && !code.trim() ? error : null} />
            <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes" multiline />

            {error && code.trim() ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actions}>
              <Button title="Cancel" variant="ghost" onPress={onClose} disabled={isSaving} style={styles.actionButton} />
              <Button title={isSaving ? "Saving..." : "Save"} onPress={submit} disabled={isSaving} style={styles.actionButton} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(7, 17, 31, 0.58)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: "88%",
    padding: spacing.lg,
    ...shadows.lg,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: colors.border.light,
    borderRadius: radii.pill,
    height: 4,
    marginBottom: spacing.md,
    width: 48,
  },
  title: {
    ...typography.h2,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  error: {
    ...typography.caption,
    color: colors.error,
  },
});
