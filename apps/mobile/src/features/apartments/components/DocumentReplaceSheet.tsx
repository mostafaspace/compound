import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { pick, types } from "@react-native-documents/picker";
import { Button } from "../../../components/ui/Button";
import { colors, radii, shadows, spacing, typography } from "../../../theme";
import { useReplaceApartmentDocumentMutation } from "../../../services/apartments/documentsApi";
import type { ApartmentDetail, ApartmentDocument, UploadFile } from "../../../services/apartments/types";

export function DocumentReplaceSheet({
  apartment,
  document,
  onClose,
}: {
  apartment: ApartmentDetail;
  document: ApartmentDocument;
  onClose: () => void;
}) {
  const isDark = useColorScheme() === "dark";
  const [file, setFile] = useState<UploadFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replaceDocument, replaceState] = useReplaceApartmentDocumentMutation();

  const chooseFile = async () => {
    try {
      const [result] = await pick({
        allowMultiSelection: false,
        type: [types.pdf, types.images],
      });

      setFile({
        uri: result.uri,
        name: result.name ?? "replacement-document",
        type: result.type ?? "application/octet-stream",
      });
    } catch {
      // Native picker throws when the user cancels.
    }
  };

  const submit = async () => {
    if (!file) {
      setError("Choose a replacement file first.");
      return;
    }

    setError(null);

    try {
      await replaceDocument({ unitId: apartment.id, documentId: document.id, file }).unwrap();
      onClose();
    } catch {
      setError("Could not submit replacement. Please try again.");
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
            Replace {formatDocumentType(document.documentType)}
          </Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
            Current document stays active while this replacement waits for admin review.
          </Text>

          <Pressable
            onPress={chooseFile}
            style={[
              styles.filePicker,
              {
                backgroundColor: colors.surfaceMuted[isDark ? "dark" : "light"],
                borderColor: colors.border[isDark ? "dark" : "light"],
              },
            ]}
          >
            <Text style={[styles.fileText, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
              {file?.name ?? "Choose PDF or image"}
            </Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Button title="Cancel" variant="ghost" onPress={onClose} disabled={replaceState.isLoading} style={styles.actionButton} />
            <Button
              title={replaceState.isLoading ? "Submitting..." : "Submit replacement"}
              onPress={submit}
              disabled={replaceState.isLoading}
              style={styles.actionButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function formatDocumentType(type: string): string {
  return type.replace(/_/g, " ");
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
    textTransform: "capitalize",
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  filePicker: {
    borderRadius: radii.xl,
    borderStyle: "dashed",
    borderWidth: 1,
    marginTop: spacing.lg,
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  fileText: {
    ...typography.bodyStrong,
    textAlign: "center",
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.md,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
});
