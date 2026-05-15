import React, { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, useColorScheme, View } from "react-native";
import { useTranslation } from "react-i18next";
import { pick, types } from "@react-native-documents/picker";
import { Typography } from "../../../../components/ui/Typography";
import { Button } from "../../../../components/ui/Button";
import { colors, layout, radii, shadows, spacing } from "../../../../theme";
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from "../../../../i18n/direction";
import {
  useGetApartmentDocumentShareLinkMutation,
  useListApartmentDocumentsQuery,
  useUploadApartmentDocumentMutation,
} from "../../../../services/apartments/documentsApi";
import type { ApartmentDetail, ApartmentDocument, UploadFile } from "../../../../services/apartments/types";
import { DocumentReplaceSheet } from "../../components/DocumentReplaceSheet";

import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../../../navigation/types";
import type { ApartmentTabRefreshProps } from "../ApartmentDetailScreen";

const DOCUMENT_TYPES = ["ownership_proof", "lease", "id_copy", "utility_bill", "other"] as const;
const OWNER_REGISTRATION_DOCUMENT_TYPES = new Set<string>(["ownership_proof", "lease", "id_copy"]);

export function DocumentsTab({ apartment, onRefresh, refreshing, onContentScroll }: { apartment: ApartmentDetail } & ApartmentTabRefreshProps) {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const isRtl = isRtlLanguage(i18n.language);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { data = apartment.documents, isLoading, isFetching, refetch } = useListApartmentDocumentsQuery(apartment.id);
  const [uploadDocument, uploadState] = useUploadApartmentDocumentMutation();
  const [getShareLink, shareLinkState] = useGetApartmentDocumentShareLinkMutation();
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [replacingDocument, setReplacingDocument] = useState<ApartmentDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<number | string | null>(null);
  const uploadableDocumentTypes = getUploadableDocumentTypes(data);
  const handleRefresh = () => {
    void refetch();
    void onRefresh?.();
  };

  const openDocument = async (document: ApartmentDocument) => {
    try {
      setError(null);
      setOpeningId(document.id);
      const { url, mimeType } = await getShareLink({ unitId: apartment.id, documentId: document.id }).unwrap();
      navigation.navigate("DocumentViewer", { 
        url, 
        mimeType,
        title: documentTitle(document, t)
      });
    } catch {
      setError(t("Documents.openError"));
    } finally {
      setOpeningId(null);
    }
  };

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
      setError(t("Documents.uploadFileError"));
    } finally {
      setUploadingType(null);
    }
  };

  const renderDocumentType = ({ item: documentType }: { item: (typeof DOCUMENT_TYPES)[number] }) => (
    <Pressable
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
      <Typography variant="caption">
        {uploadingType === documentType ? t("Documents.uploading") : t("Documents.uploadType", { type: formatDocumentType(documentType, t) })}
      </Typography>
    </Pressable>
  );

  return (
    <>
      <FlatList
        data={data}
        keyExtractor={(document) => String(document.id)}
        contentContainerStyle={styles.list}
        refreshing={Boolean(refreshing || isFetching)}
        onRefresh={handleRefresh}
        onScroll={onContentScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <View
            style={[
              styles.headerCard,
              {
                backgroundColor: colors.surface[isDark ? "dark" : "light"],
                borderColor: colors.border[isDark ? "dark" : "light"],
              },
              textDirectionStyle(isRtl),
            ]}
          >
            <Typography variant="label" color="primary">{t("Documents.label")}</Typography>
            <Typography variant="h2" style={{ marginTop: spacing.xs }}>
              {t("Documents.cabinetTitle")}
            </Typography>
            <Typography variant="body" color="secondary" style={{ marginTop: spacing.xs }}>
              {t("Documents.cabinetSubtitle")}
            </Typography>
            {isLoading ? (
              <ActivityIndicator color={colors.primary[isDark ? "dark" : "light"]} style={styles.loader} />
            ) : null}
            {error ? <Typography variant="error" style={styles.error}>{error}</Typography> : null}
          </View>
        }
        ListEmptyComponent={<EmptyState t={t} isRtl={isRtl} />}
        ListFooterComponent={
          <View
            style={[
              styles.uploadCard,
              {
                backgroundColor: colors.surface[isDark ? "dark" : "light"],
                borderColor: colors.border[isDark ? "dark" : "light"],
              },
              textDirectionStyle(isRtl),
            ]}
          >
            <Typography variant="bodyStrong">
              {t("Documents.uploadAnother")}
            </Typography>
            <FlatList
              data={uploadableDocumentTypes}
              keyExtractor={(documentType) => documentType}
              renderItem={renderDocumentType}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={[styles.typeGrid, rowDirectionStyle(isRtl)]}
              contentContainerStyle={styles.typeList}
              ListEmptyComponent={
                <Typography variant="caption" color="secondary" style={textDirectionStyle(isRtl)}>
                  {t("Documents.noAddableDocuments")}
                </Typography>
              }
            />
          </View>
        }
        renderItem={({ item }) => (
          <DocumentRow
            document={item}
            isDark={isDark}
            isRtl={isRtl}
            opening={openingId === item.id}
            onReplace={() => setReplacingDocument(item)}
            onOpen={() => openDocument(item)}
            t={t}
          />
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
  isRtl,
  opening,
  onReplace,
  onOpen,
  t,
}: {
  document: ApartmentDocument;
  isDark: boolean;
  isRtl: boolean;
  opening: boolean;
  onReplace: () => void;
  onOpen: () => void;
  t: any;
}) {
  const text = colors.text.primary[isDark ? "dark" : "light"];
  const secondary = colors.text.secondary[isDark ? "dark" : "light"];
  const isRegistrationDocument = OWNER_REGISTRATION_DOCUMENT_TYPES.has(document.documentType);

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.document,
        {
          backgroundColor: colors.surface[isDark ? "dark" : "light"],
          borderColor: colors.border[isDark ? "dark" : "light"],
          opacity: pressed ? 0.7 : 1,
        },
        textDirectionStyle(isRtl)
      ]}
    >
      <View style={[styles.documentTop, rowDirectionStyle(isRtl)]}>
        <View style={[styles.documentCopy, textDirectionStyle(isRtl)]}>
          <Typography variant="bodyStrong">{formatDocumentType(document.documentType, t)}</Typography>
          <Typography variant="caption" color="secondary" style={{ marginTop: spacing.xs }}>
            v{document.version} · {t(`Documents.statuses.${document.status}`, { defaultValue: document.status })} · {formatDate(document.createdAt, t)}
          </Typography>
        </View>
        <Typography 
          variant="label" 
          style={[
            styles.statusBadge, 
            { backgroundColor: document.status === "active" ? colors.success : colors.warning }
          ]}
        >
          {t(`Documents.statuses.${document.status}`, { defaultValue: document.status })}
        </Typography>
      </View>
      <Typography variant="caption" color="secondary" style={{ marginTop: spacing.sm }}>
        {documentMeta(document, t)}
      </Typography>
      <View style={[styles.actionsRow, rowDirectionStyle(isRtl)]}>
        <Button
          title={opening ? t("Documents.opening") : t("Documents.view")}
          variant="primary"
          onPress={onOpen}
          disabled={opening}
          style={styles.actionBtn}
        />
        {isRegistrationDocument ? (
          <View
            style={[
              styles.lockedPill,
              {
                borderColor: colors.border[isDark ? "dark" : "light"],
                backgroundColor: colors.surfaceMuted[isDark ? "dark" : "light"],
              },
            ]}
          >
            <Typography variant="caption" color="secondary" style={textDirectionStyle(isRtl)}>
              {t("Documents.registrationLocked")}
            </Typography>
          </View>
        ) : (
          <Button
            title={t("Documents.replace")}
            variant="secondary"
            onPress={onReplace}
            style={styles.actionBtn}
          />
        )}
      </View>
    </Pressable>
  );
}

function EmptyState({ t, isRtl }: { t: any, isRtl: boolean }) {
  const isDark = useColorScheme() === "dark";

  return (
    <View
      style={[
        styles.empty,
        {
          backgroundColor: colors.surface[isDark ? "dark" : "light"],
          borderColor: colors.border[isDark ? "dark" : "light"],
        },
        textDirectionStyle(isRtl),
      ]}
    >
      <Typography variant="h3">{t("Documents.noDocuments")}</Typography>
      <Typography variant="body" color="secondary" style={{ marginTop: spacing.xs }}>
        {t("Documents.noDocumentsHint")}
      </Typography>
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

function formatDocumentType(type: string, t: any): string {
  return t(`Documents.types.${type}`, { defaultValue: type.replace(/_/g, " ") });
}

function documentTitle(document: ApartmentDocument, t: any): string {
  return `${formatDocumentType(document.documentType, t)} v${document.version}`;
}

function documentMeta(document: ApartmentDocument, t: any): string {
  const parts = [
    formatMimeType(document.mimeType, t),
    document.sizeBytes ? formatFileSize(document.sizeBytes) : null,
  ].filter(Boolean);

  return parts.join(" · ");
}

function getUploadableDocumentTypes(documents: ApartmentDocument[]): (typeof DOCUMENT_TYPES)[number][] {
  const activeDocumentTypes = new Set<string>();
  for (const document of documents) {
    if (document.status === "active") {
      activeDocumentTypes.add(document.documentType);
    }
  }

  const uploadableTypes: (typeof DOCUMENT_TYPES)[number][] = [];
  for (const documentType of DOCUMENT_TYPES) {
    const lockedAndPresent = OWNER_REGISTRATION_DOCUMENT_TYPES.has(documentType) && activeDocumentTypes.has(documentType);
    if (!lockedAndPresent) {
      uploadableTypes.push(documentType);
    }
  }

  return uploadableTypes;
}

function formatMimeType(mimeType: string | null, t: any): string {
  if (!mimeType) {
    return t("Documents.file", { defaultValue: "File" });
  }

  if (mimeType === "application/pdf") {
    return t("Documents.pdf", { defaultValue: "PDF" });
  }

  if (mimeType.startsWith("image/")) {
    return t("Documents.image", { defaultValue: "Image" });
  }

  return mimeType.split("/").pop()?.toUpperCase() ?? t("Documents.file", { defaultValue: "File" });
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string | null, t: any): string {
  if (!value) {
    return t("Violations.noDate");
  }

  return new Date(value).toLocaleDateString();
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
    padding: layout.screenGutter,
  },
  headerCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: layout.heroPadding,
    ...shadows.sm,
  },
  loader: {
    marginTop: spacing.md,
  },
  error: {
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
  statusBadge: {
    borderRadius: radii.pill,
    color: colors.text.inverse,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textTransform: "capitalize",
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
  lockedPill: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: "center",
  },
  empty: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: layout.heroPadding,
    ...shadows.sm,
  },
  uploadCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: layout.heroPadding,
    ...shadows.sm,
  },
  typeGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  typeList: {
    marginTop: spacing.md,
  },
  typeChip: {
    flex: 1,
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
