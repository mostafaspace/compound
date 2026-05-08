import React, { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { pick, types } from "@react-native-documents/picker";
import { Button } from "../../../../components/ui/Button";
import { colors, radii, shadows, spacing, typography } from "../../../../theme";
import {
  useListApartmentDocumentsQuery,
  useUploadApartmentDocumentMutation,
} from "../../../../services/apartments/documentsApi";
import type { ApartmentDetail, ApartmentDocument, UploadFile } from "../../../../services/apartments/types";
import { DocumentReplaceSheet } from "../../components/DocumentReplaceSheet";

const DOCUMENT_TYPES = ["ownership_proof", "lease", "id_copy", "utility_bill", "other"] as const;

export function DocumentsTab({ apartment }: { apartment: ApartmentDetail }) {
  const isDark = useColorScheme() === "dark";
  const { data = apartment.documents, isLoading } = useListApartmentDocumentsQuery(apartment.id);
  const [uploadDocument, uploadState] = useUploadApartmentDocumentMutation();
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [replacingDocument, setReplacingDocument] = useState<ApartmentDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickAndUpload = async (documentType: string) => {
    try {
      setError(null);
      const file = await pickFile();

      if (!file) {
        return;
      }

      setUploadingType(documentType);
      await uploadDocument({ unitId: apartment.id, body: { document_type: documentType, file } }).unwrap();
    } catch {
      setError("Could not upload document. Please try again.");
    } finally {
      setUploadingType(null);
    }
  };

  return (
    <>
      <FlatList
        data={data}
        keyExtractor={(document) => String(document.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={[styles.headerCard, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
            <Text style={[styles.eyebrow, { color: colors.primary[isDark ? "dark" : "light"] }]}>Documents</Text>
            <Text style={[styles.title, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
              Apartment file cabinet
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
              Upload new documents immediately. Replacements stay pending until admin approval.
            </Text>
            {isLoading ? (
              <ActivityIndicator color={colors.primary[isDark ? "dark" : "light"]} style={styles.loader} />
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={<EmptyState />}
        ListFooterComponent={
          <View style={[styles.uploadCard, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
            <Text style={[styles.uploadTitle, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
              Upload another document
            </Text>
            <View style={styles.typeGrid}>
              {DOCUMENT_TYPES.map((documentType) => (
                <Pressable
                  key={documentType}
                  disabled={uploadState.isLoading}
                  onPress={() => {
                    void pickAndUpload(documentType);
                  }}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: colors.surfaceMuted[isDark ? "dark" : "light"],
                      borderColor: colors.border[isDark ? "dark" : "light"],
                      opacity: uploadState.isLoading ? 0.64 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.typeChipText, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
                    {uploadingType === documentType ? "Uploading..." : `Upload ${formatDocumentType(documentType)}`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <DocumentRow document={item} isDark={isDark} onReplace={() => setReplacingDocument(item)} />
        )}
      />

      {replacingDocument ? (
        <DocumentReplaceSheet
          apartment={apartment}
          document={replacingDocument}
          onClose={() => setReplacingDocument(null)}
        />
      ) : null}
    </>
  );
}

function DocumentRow({
  document,
  isDark,
  onReplace,
}: {
  document: ApartmentDocument;
  isDark: boolean;
  onReplace: () => void;
}) {
  const text = colors.text.primary[isDark ? "dark" : "light"];
  const secondary = colors.text.secondary[isDark ? "dark" : "light"];

  return (
    <View
      style={[
        styles.document,
        {
          backgroundColor: colors.surface[isDark ? "dark" : "light"],
          borderColor: colors.border[isDark ? "dark" : "light"],
        },
      ]}
    >
      <View style={styles.documentTop}>
        <View style={styles.documentCopy}>
          <Text style={[styles.documentTitle, { color: text }]}>{formatDocumentType(document.documentType)}</Text>
          <Text style={[styles.documentMeta, { color: secondary }]}>
            v{document.version} · {document.status} · {formatDate(document.createdAt)}
          </Text>
        </View>
        <Text style={[styles.statusBadge, { backgroundColor: document.status === "active" ? colors.success : colors.warning }]}>
          {document.status}
        </Text>
      </View>
      <Text style={[styles.fileName, { color: secondary }]} numberOfLines={1}>
        {filename(document.filePath)}
      </Text>
      <Button title="Replace" variant="secondary" onPress={onReplace} style={styles.replaceButton} />
    </View>
  );
}

function EmptyState() {
  const isDark = useColorScheme() === "dark";

  return (
    <View style={[styles.empty, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
      <Text style={[styles.emptyTitle, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
        No apartment documents
      </Text>
      <Text style={[styles.emptyBody, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
        Upload lease, ID, utility, ownership proof, or supporting documents from here.
      </Text>
    </View>
  );
}

async function pickFile(): Promise<UploadFile | null> {
  try {
    const [result] = await pick({
      allowMultiSelection: false,
      type: [types.pdf, types.images],
    });

    return {
      uri: result.uri,
      name: result.name ?? "apartment-document",
      type: result.type ?? "application/octet-stream",
    };
  } catch {
    return null;
  }
}

function formatDocumentType(type: string): string {
  return type.replace(/_/g, " ");
}

function filename(path: string): string {
  return path.split("/").pop() ?? path;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "No date";
  }

  return new Date(value).toLocaleDateString();
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
    padding: spacing.md,
  },
  headerCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  eyebrow: {
    ...typography.label,
  },
  title: {
    ...typography.h2,
    marginTop: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  loader: {
    marginTop: spacing.md,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.md,
  },
  document: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
  },
  documentTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  documentCopy: {
    flex: 1,
  },
  documentTitle: {
    ...typography.bodyStrong,
    textTransform: "capitalize",
  },
  documentMeta: {
    ...typography.caption,
    marginTop: spacing.xs,
    textTransform: "capitalize",
  },
  statusBadge: {
    ...typography.caption,
    borderRadius: radii.pill,
    color: colors.text.inverse,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textTransform: "capitalize",
  },
  fileName: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  replaceButton: {
    marginTop: spacing.md,
  },
  empty: {
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
  },
  emptyBody: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  uploadCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  uploadTitle: {
    ...typography.bodyStrong,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  typeChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  typeChipText: {
    ...typography.caption,
    textTransform: "capitalize",
  },
});
