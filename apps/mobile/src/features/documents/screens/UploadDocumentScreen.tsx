import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View, useColorScheme } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { pick, types } from "@react-native-documents/picker";
import { useTranslation } from "react-i18next";
import type { DocumentType } from "@compound/contracts";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { Button } from "../../../components/ui/Button";
import { Typography } from "../../../components/ui/Typography";
import { useGetDocumentTypesQuery, useUploadDocumentMutation } from "../../../services/property";
import { colors, layout, radii, spacing } from "../../../theme";
import { Icon } from "../../../components/ui/Icon";

type PickedFile = {
  uri: string;
  name: string;
  type: string;
};

export const UploadDocumentScreen = () => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const navigation = useNavigation();
  const { data: documentTypes = [] } = useGetDocumentTypesQuery();
  const [uploadDocument, { isLoading }] = useUploadDocumentMutation();
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);

  const surface = isDark ? colors.surface.dark : colors.surface.light;
  const border = isDark ? colors.border.dark : colors.border.light;
  const text = isDark ? colors.text.primary.dark : colors.text.primary.light;

  const handlePickFile = async () => {
    try {
      const [result] = await pick({
        allowMultiSelection: false,
        type: [types.pdf, types.images],
      });

      setPickedFile({
        uri: result.uri,
        name: result.name ?? "document",
        type: result.type ?? "application/octet-stream",
      });
    } catch {
      // User cancelled.
    }
  };

  const handleUpload = async () => {
    if (!selectedTypeId) {
      Alert.alert(t("Documents.selectTypeRequired", { defaultValue: "Please select a document type." }));
      return;
    }

    if (!pickedFile) {
      Alert.alert(t("Documents.selectFileRequired", { defaultValue: "Please select a file." }));
      return;
    }

    try {
      const formData = new FormData();
      formData.append("documentTypeId", String(selectedTypeId));
      formData.append("file", {
        uri: pickedFile.uri,
        name: pickedFile.name,
        type: pickedFile.type,
      } as never);

      await uploadDocument(formData).unwrap();

      Alert.alert(
        t("Documents.uploadSuccessTitle", { defaultValue: "Document uploaded" }),
        t("Documents.uploadSuccessMsg", { defaultValue: "Your document has been submitted for review." }),
        [{ text: t("Common.done"), onPress: () => navigation.goBack() }]
      );
    } catch {
      Alert.alert(
        t("Common.error", { defaultValue: "Error" }),
        t("Documents.uploadError", { defaultValue: "Upload failed. Please try again." })
      );
    }
  };

  const activeDocumentTypes = documentTypes.filter((documentType: DocumentType) => documentType.isActive);

  return (
    <ScreenContainer withKeyboard>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Typography variant="label" style={[styles.label, { color: text }]}>
          {t("Documents.typeLabel", { defaultValue: "Document type" })}
        </Typography>

        <View style={styles.typeList}>
          {activeDocumentTypes.map((documentType: DocumentType) => (
            <Pressable
              key={documentType.id}
              onPress={() => setSelectedTypeId(documentType.id)}
              style={[
                styles.typeChip,
                {
                  backgroundColor:
                    selectedTypeId === documentType.id
                      ? isDark
                        ? colors.primary.dark
                        : colors.primary.light
                      : surface,
                borderColor: selectedTypeId === documentType.id ? "transparent" : border,
                },
              ]}
            >
              <Typography
                variant="caption"
                style={{ color: selectedTypeId === documentType.id ? colors.text.inverse : text, fontWeight: "600" }}
              >
                {documentType.name}
              </Typography>
            </Pressable>
          ))}
        </View>

        {!activeDocumentTypes.length ? (
          <Typography variant="caption" style={styles.helperText}>
            {t("Documents.noTypes", { defaultValue: "No active document types are available yet." })}
          </Typography>
        ) : null}

        <Typography variant="label" style={[styles.label, { color: text }]}>
          {t("Documents.fileLabel", { defaultValue: "File (PDF, JPG, PNG)" })}
        </Typography>

        <Pressable onPress={handlePickFile} style={[styles.filePicker, { backgroundColor: surface, borderColor: border }]}>
          <Icon name="documents" color={pickedFile ? colors.primary.light : colors.text.secondary.light} size={24} />
          <Typography style={{ color: pickedFile ? text : colors.text.secondary.light, textAlign: "center" }}>
            {pickedFile ? pickedFile.name : t("Documents.chooseFile", { defaultValue: "Tap to choose file..." })}
          </Typography>
        </Pressable>

        <Button
          title={isLoading ? t("Common.loading") : t("Documents.upload", { defaultValue: "Upload Document" })}
          onPress={handleUpload}
          loading={isLoading}
          style={styles.submitBtn}
          leftIcon="plus"
        />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingBottom: layout.screenBottom },
  label: { marginBottom: spacing.xs, marginTop: spacing.md, fontWeight: "600" },
  typeList: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  typeChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, borderWidth: 1 },
  filePicker: { borderWidth: 1, borderRadius: radii.xl, padding: layout.heroPadding, borderStyle: "dashed", alignItems: "center", gap: spacing.sm },
  helperText: { marginTop: spacing.sm },
  submitBtn: { marginTop: layout.sectionGap, borderRadius: radii.lg },
});
