import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  useColorScheme,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { launchImageLibrary } from "react-native-image-picker";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Typography } from "../../../components/ui/Typography";
import { colors, radii, spacing, typography } from "../../../theme";
import { useCreateResidentMutation, useUpdateResidentMutation } from "../../../services/apartments/residentsApi";
import type { ApartmentDetail, ApartmentResident, UploadFile } from "../../../services/apartments/types";
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from "../../../i18n/direction";

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
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const isRtl = isRtlLanguage(i18n.language);
  const [name, setName] = useState(resident?.residentName ?? "");
  const [phone, setPhone] = useState(resident?.residentPhone ?? "");
  const [email, setEmail] = useState(resident?.residentEmail ?? "");
  const [relation, setRelation] = useState(resident?.relationType ?? "resident");
  const [photo, setPhoto] = useState<UploadFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createResident, createState] = useCreateResidentMutation();
  const [updateResident, updateState] = useUpdateResidentMutation();
  const isSaving = createState.isLoading || updateState.isLoading;
  const renderRelation = ({ item: option }: { item: (typeof RELATION_TYPES)[number] }) => {
    const selected = option === relation;

    return (
      <Pressable
        onPress={() => setRelation(option)}
        style={[
          styles.chip,
          {
            backgroundColor: selected ? colors.primary[isDark ? "dark" : "light"] : "transparent",
            borderColor: selected ? colors.primary[isDark ? "dark" : "light"] : colors.border[isDark ? "dark" : "light"],
          },
        ]}
      >
        <Typography
          variant="caption"
          style={{ color: selected ? colors.text.inverse : colors.text.primary[isDark ? "dark" : "light"] }}
        >
          {t(`Common.relations.${option}`)}
        </Typography>
      </Pressable>
    );
  };

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
      setError(t("Residents.errors.relationRequired"));
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
      setError(t("Residents.errors.saveFailed"));
    }
  };

  return (
    <BottomSheet
      onClose={onClose}
      header={
        <>
          <Typography variant="h2" style={textDirectionStyle(isRtl)}>
            {resident ? t("Residents.editResident") : t("Residents.addResident")}
          </Typography>
          <Typography variant="body" color="secondary" style={[styles.subtitle, textDirectionStyle(isRtl)]}>
            {t("Residents.nonUserHint")}
          </Typography>
        </>
      }
      footer={
        <View>
          <View style={[styles.actions, rowDirectionStyle(isRtl)]}>
            <Button title={t("Common.cancel")} variant="ghost" onPress={onClose} disabled={isSaving} style={styles.actionButton} />
            <Button
              title={isSaving ? t("Common.saving") : t("Common.save")}
              onPress={submit}
              disabled={isSaving}
              style={styles.actionButton}
            />
          </View>

          {isSaving ? <ActivityIndicator color={colors.primary[isDark ? "dark" : "light"]} style={styles.loader} /> : null}
        </View>
      }
    >
      <View style={styles.form}>
        <Input label={t("Residents.fields.name")} value={name} onChangeText={setName} placeholder={t("Residents.fields.namePlaceholder")} />
        <Input label={t("Residents.fields.phone")} value={phone} onChangeText={setPhone} placeholder={t("Residents.fields.phonePlaceholder")} keyboardType="phone-pad" />
        <Input label={t("Residents.fields.email")} value={email} onChangeText={setEmail} placeholder={t("Residents.fields.emailPlaceholder")} keyboardType="email-address" autoCapitalize="none" />

        <Typography variant="label" color="secondary" style={[styles.label, textDirectionStyle(isRtl)]}>
          {t("Residents.fields.relation")}
        </Typography>
        <FlatList
          data={RELATION_TYPES}
          keyExtractor={(option) => option}
          renderItem={renderRelation}
          horizontal
          inverted={isRtl}
          scrollEnabled={false}
          contentContainerStyle={[styles.chips, rowDirectionStyle(isRtl)]}
        />

        <Button
          title={photo ? t("Residents.actions.photoSelected") : t("Residents.actions.pickPhoto")}
          variant="outline"
          onPress={pickPhoto}
          style={styles.photoButton}
        />

        {error ? <Typography variant="caption" style={styles.error}>{error}</Typography> : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.sm,
  },
  subtitle: {
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
  },
  actionButton: {
    flex: 1,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.md,
  },
  loader: {
    marginTop: spacing.sm,
  },
});
