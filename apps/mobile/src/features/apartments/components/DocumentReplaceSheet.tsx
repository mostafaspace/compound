import React, { useState } from "react";
import { Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { pick, types } from "@react-native-documents/picker";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { Button } from "../../../components/ui/Button";
import { colors, radii, spacing, typography } from "../../../theme";
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
    <BottomSheet
      title={`Replace ${formatDocumentType(document.documentType)}`}
      subtitle="Current document stays active while this replacement waits for admin review."
      onClose={onClose}
      titleStyle={styles.title}
      footer={
        <View style={styles.actions}>
          <Button title="Cancel" variant="ghost" onPress={onClose} disabled={replaceState.isLoading} style={styles.actionButton} />
          <Button
            title={replaceState.isLoading ? "Submitting..." : "Submit replacement"}
            onPress={submit}
            disabled={replaceState.isLoading}
            style={styles.actionButton}
          />
        </View>
      }
    >
      <View>
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
      </View>
    </BottomSheet>
  );
}

function formatDocumentType(type: string): string {
  return type.replace(/_/g, " ");
}

const styles = StyleSheet.create({
  title: {
    textTransform: "capitalize",
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
  },
  actionButton: {
    flex: 1,
  },
});
