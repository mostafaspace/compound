import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { colors, spacing, typography } from "../../../theme";
import { useCreateVehicleMutation, useUpdateVehicleMutation } from "../../../services/apartments/vehiclesApi";
import type { ApartmentDetail, ApartmentVehicle, PlateFormat } from "../../../services/apartments/types";
import { PlateInput } from "./PlateInput";

export function VehicleSheet({
  apartment,
  vehicle,
  onClose,
}: {
  apartment: ApartmentDetail;
  vehicle?: ApartmentVehicle;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [plateFormat, setPlateFormat] = useState<PlateFormat>(vehicle?.plateFormat ?? "letters_numbers");
  const [plateLetters, setPlateLetters] = useState(vehicle?.plateLettersAr ?? "");
  const [plateDigits, setPlateDigits] = useState(vehicle?.plateDigits ?? "");
  const [make, setMake] = useState(vehicle?.make ?? "");
  const [model, setModel] = useState(vehicle?.model ?? "");
  const [color, setColor] = useState(vehicle?.color ?? "");
  const [notes, setNotes] = useState(vehicle?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [createVehicle, createState] = useCreateVehicleMutation();
  const [updateVehicle, updateState] = useUpdateVehicleMutation();
  const isSaving = createState.isLoading || updateState.isLoading;

  const submit = async () => {
    if (!plateDigits.trim()) {
      setError(t("Vehicles.required", { field: t("Vehicles.plateDigits") }));
      return;
    }
    if (plateFormat === "letters_numbers" && !plateLetters.trim()) {
      setError(t("Vehicles.formatRequired", { field: t("Vehicles.plateLetters") }));
      return;
    }

    setError(null);

    const body = {
      plate_format: plateFormat,
      plate_letters_input: plateFormat === "letters_numbers" ? plateLetters.trim() : undefined,
      plate_digits_input: plateDigits.trim(),
      make: make.trim() || null,
      model: model.trim() || null,
      color: color.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      if (vehicle) {
        await updateVehicle({ unitId: apartment.id, vehicleId: vehicle.id, body }).unwrap();
      } else {
        await createVehicle({ unitId: apartment.id, body }).unwrap();
      }

      onClose();
    } catch {
      setError(t("Vehicles.saveError"));
    }
  };

  return (
    <BottomSheet
      title={vehicle ? t("Vehicles.editVehicle") : t("Vehicles.addVehicle")}
      onClose={onClose}
      footer={
        <View style={styles.actions}>
          <Button title={t("Vehicles.cancel")} variant="ghost" onPress={onClose} disabled={isSaving} style={styles.actionButton} />
          <Button title={isSaving ? t("Vehicles.saving") : t("Vehicles.save")} onPress={submit} disabled={isSaving} style={styles.actionButton} />
        </View>
      }
    >
      <View style={styles.form}>
        <PlateInput
          format={plateFormat}
          letters={plateLetters}
          digits={plateDigits}
          onChange={({ format, letters, digits }) => {
            setPlateFormat(format);
            setPlateLetters(letters);
            setPlateDigits(digits);
          }}
        />
        <Input label={t("Vehicles.make")} value={make} onChangeText={setMake} placeholder={t("Vehicles.makePlaceholder")} />
        <Input label={t("Vehicles.model")} value={model} onChangeText={setModel} placeholder={t("Vehicles.modelPlaceholder")} />
        <Input label={t("Vehicles.color")} value={color} onChangeText={setColor} placeholder={t("Vehicles.colorPlaceholder")} />
        <Input label={t("Vehicles.notes")} value={notes} onChangeText={setNotes} placeholder={t("Vehicles.optionalNotes")} multiline />

        {error ? <Text style={styles.error}>{error}</Text> : null}
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
