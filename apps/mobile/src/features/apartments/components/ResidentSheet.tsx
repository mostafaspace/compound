import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { colors, radii, shadows, spacing, typography } from "../../../theme";
import { useCreateResidentMutation, useUpdateResidentMutation } from "../../../services/apartments/residentsApi";
import type { ApartmentDetail, ApartmentResident, UploadFile } from "../../../services/apartments/types";

const RELATION_TYPES = ["resident", "tenant", "owner", "representative"] as const;

export function ResidentSheet({
  apartment,
  resident,
  onClose,
}: {
  apartment: ApartmentDetail;
  resident?: ApartmentResident;
  onClose: () => void;
}) {
  const isDark = useColorScheme() === "dark";
  const [name, setName] = useState(resident?.residentName ?? "");
  const [phone, setPhone] = useState(resident?.residentPhone ?? "");
  const [email, setEmail] = useState(resident?.residentEmail ?? "");
  const [relation, setRelation] = useState(resident?.relationType ?? "resident");
  const [photo, setPhoto] = useState<UploadFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createResident, createState] = useCreateResidentMutation();
  const [updateResident, updateState] = useUpdateResidentMutation();
  const isSaving = createState.isLoading || updateState.isLoading;

  const pickPhoto = async () => {
    const result = await launchImageLibrary({ mediaType: "photo", quality: 0.7, selectionLimit: 1 });
    const asset = result.assets?.[0];

    if (!asset?.uri) {
      return;
    }

    setPhoto({
      uri: asset.uri,
      name: asset.fileName ?? `resident-${Date.now()}.jpg`,
      type: asset.type ?? "image/jpeg",
    });
  };

  const submit = async () => {
    if (!relation) {
      setError("Choose a relation type.");
      return;
    }

    setError(null);

    const body = {
      relation_type: relation,
      resident_name: name.trim() || null,
      resident_phone: phone.trim() || null,
      resident_email: email.trim() || null,
      photo,
    };

    try {
      if (resident) {
        await updateResident({ unitId: apartment.id, residentId: resident.id, body }).unwrap();
      } else {
        await createResident({ unitId: apartment.id, body }).unwrap();
      }

      onClose();
    } catch {
      setError("Could not save resident. Please try again.");
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.handle} />
            <Text style={[styles.title, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
              {resident ? "Edit resident" : "Add resident"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
              Non-user residents can be captured with contact details and an optional photo.
            </Text>

            <Input label="Name" value={name} onChangeText={setName} placeholder="Resident name" />
            <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" />
            <Input label="Email" value={email} onChangeText={setEmail} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" />

            <Text style={[styles.label, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>Relation</Text>
            <View style={styles.chips}>
              {RELATION_TYPES.map((option) => {
                const selected = option === relation;

                return (
                  <Pressable
                    key={option}
                    onPress={() => setRelation(option)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? colors.primary[isDark ? "dark" : "light"] : "transparent",
                        borderColor: selected ? colors.primary[isDark ? "dark" : "light"] : colors.border[isDark ? "dark" : "light"],
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: selected ? colors.text.inverse : colors.text.primary[isDark ? "dark" : "light"] }]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Button
              title={photo ? "Photo selected" : "Pick photo"}
              variant="outline"
              onPress={pickPhoto}
              style={styles.photoButton}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actions}>
              <Button title="Cancel" variant="ghost" onPress={onClose} disabled={isSaving} style={styles.actionButton} />
              <Button
                title={isSaving ? "Saving..." : "Save"}
                onPress={submit}
                disabled={isSaving}
                style={styles.actionButton}
              />
            </View>

            {isSaving ? <ActivityIndicator color={colors.primary[isDark ? "dark" : "light"]} /> : null}
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
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: {
    ...typography.caption,
    textTransform: "capitalize",
  },
  photoButton: {
    marginTop: spacing.lg,
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
    marginTop: spacing.md,
  },
});
