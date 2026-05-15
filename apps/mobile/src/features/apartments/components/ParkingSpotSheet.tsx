import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [code, setCode] = useState(parkingSpot?.code ?? "");
  const [notes, setNotes] = useState(parkingSpot?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [createParkingSpot, createState] = useCreateParkingSpotMutation();
  const [updateParkingSpot, updateState] = useUpdateParkingSpotMutation();
  const isSaving = createState.isLoading || updateState.isLoading;

  const submit = async () => {
    if (!code.trim()) {
      setError(t("Parking.codeRequired"));
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
      setError(t("Parking.saveError"));
    }
  };

  return (
    <BottomSheet
      title={parkingSpot ? t("Parking.editParking") : t("Parking.addParking")}
      onClose={onClose}
      footer={
        <View style={styles.actions}>
          <Button title={t("Common.cancel")} variant="ghost" onPress={onClose} disabled={isSaving} style={styles.actionButton} />
          <Button title={isSaving ? t("Common.saving") : t("Common.save")} onPress={submit} disabled={isSaving} style={styles.actionButton} />
        </View>
      }
    >
      <View style={styles.form}>
        <Input
          label={t("Parking.spotCode")}
          value={code}
          onChangeText={setCode}
          placeholder={t("Parking.spotPlaceholder")}
          autoCapitalize="characters"
          error={error && !code.trim() ? error : null}
        />
        <Input label={t("Parking.notes")} value={notes} onChangeText={setNotes} placeholder={t("Parking.optionalNotes")} multiline />

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
