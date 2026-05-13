import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { colors, spacing, typography } from "../../../theme";
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
    <BottomSheet
      title={parkingSpot ? "Edit parking" : "Add parking"}
      subtitle="Parking capacity is capped at 4 per unit."
      onClose={onClose}
      footer={
        <View style={styles.actions}>
          <Button title="Cancel" variant="ghost" onPress={onClose} disabled={isSaving} style={styles.actionButton} />
          <Button title={isSaving ? "Saving..." : "Save"} onPress={submit} disabled={isSaving} style={styles.actionButton} />
        </View>
      }
    >
      <View style={styles.form}>
        <Input label="Spot code" value={code} onChangeText={setCode} placeholder="B2-17" autoCapitalize="characters" error={error && !code.trim() ? error : null} />
        <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes" multiline />

        {error && code.trim() ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.sm,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  error: {
    ...typography.caption,
    color: colors.error,
  },
});
