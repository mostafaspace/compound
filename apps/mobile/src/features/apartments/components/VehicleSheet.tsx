import React, { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { colors, radii, shadows, spacing, typography } from "../../../theme";
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
  const isDark = useColorScheme() === "dark";
  const [plateFormat, setPlateFormat] = useState<PlateFormat>(vehicle?.plateFormat ?? "letters_numbers");
  const [plateLetters, setPlateLetters] = useState(vehicle?.plateLettersAr ?? "");
  const [plateDigits, setPlateDigits] = useState(vehicle?.plateDigits ?? "");
  const [make, setMake] = useState(vehicle?.make ?? "");
  const [model, setModel] = useState(vehicle?.model ?? "");
  const [color, setColor] = useState(vehicle?.color ?? "");
  const [stickerCode, setStickerCode] = useState(vehicle?.stickerCode ?? "");
  const [notes, setNotes] = useState(vehicle?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [createVehicle, createState] = useCreateVehicleMutation();
  const [updateVehicle, updateState] = useUpdateVehicleMutation();
  const isSaving = createState.isLoading || updateState.isLoading;

  const submit = async () => {
    if (!plateDigits.trim()) {
      setError("Plate digits are required.");
      return;
    }
    if (plateFormat === "letters_numbers" && !plateLetters.trim()) {
      setError("Plate letters are required for this format.");
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
      sticker_code: stickerCode.trim() || null,
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
      setError("Could not save vehicle. Please try again.");
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.handle} />
            <Text style={[styles.title, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
              {vehicle ? "Edit vehicle" : "Add vehicle"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
              Vehicle capacity is capped at 4 per unit.
            </Text>

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
            <Input label="Make" value={make} onChangeText={setMake} placeholder="Toyota" />
            <Input label="Model" value={model} onChangeText={setModel} placeholder="Corolla" />
            <Input label="Color" value={color} onChangeText={setColor} placeholder="White" />
            <Input label="Sticker code" value={stickerCode} onChangeText={setStickerCode} placeholder="Optional" />
            <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes" multiline />

            {error ? <Text style={styles.error}>{error}</Text> : null}

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
