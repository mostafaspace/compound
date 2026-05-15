import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { BottomSheet } from "../../../../components/ui/BottomSheet";
import { Typography } from "../../../../components/ui/Typography";
import { Button } from "../../../../components/ui/Button";
import { colors, radii, shadows, spacing, typography } from "../../../../theme";
import { isRtlLanguage, rowDirectionStyle, textDirectionStyle } from "../../../../i18n/direction";
import {
  useAppendNoteMutation,
  useDeleteNoteMutation,
  useListNotesQuery,
  useUpdateNoteMutation,
} from "../../../../services/apartments/notesApi";
import type { ApartmentDetail, ApartmentNote } from "../../../../services/apartments/types";
import type { ApartmentTabRefreshProps } from "../ApartmentDetailScreen";

export function NotesTab({ apartment, onRefresh, refreshing, onContentScroll }: { apartment: ApartmentDetail } & ApartmentTabRefreshProps) {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const isRtl = isRtlLanguage(i18n.language);
  const [body, setBody] = useState("");
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<ApartmentNote | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);
  const { data = apartment.recentNotes, isLoading, isFetching, refetch } = useListNotesQuery(apartment.id);
  const [appendNote, appendState] = useAppendNoteMutation();
  const [updateNote, updateState] = useUpdateNoteMutation();
  const [deleteNote] = useDeleteNoteMutation();

  const submit = async () => {
    const trimmed = body.trim();

    if (!trimmed) {
      setComposerError(t("Notes.bodyRequired"));
      return;
    }

    setComposerError(null);

    try {
      await appendNote({ unitId: apartment.id, body: trimmed }).unwrap();
      setBody("");
      setShowAddSheet(false);
    } catch {
      setComposerError(t("Notes.addNoteError"));
    }
  };

  const openAddSheet = () => {
    setComposerError(null);
    setShowAddSheet(true);
  };

  const closeAddSheet = () => {
    setShowAddSheet(false);
    setComposerError(null);
  };

  const startEditing = (note: ApartmentNote) => {
    setEditingNote(note);
    setEditingBody(note.body);
    setEditError(null);
    setListError(null);
  };

  const cancelEditing = () => {
    setEditingNote(null);
    setEditingBody("");
    setEditError(null);
  };

  const submitEdit = async () => {
    if (!editingNote) {
      return;
    }

    const trimmed = editingBody.trim();

    if (!trimmed) {
      setEditError(t("Notes.bodyRequired"));
      return;
    }

    setEditError(null);

    try {
      await updateNote({ unitId: apartment.id, noteId: editingNote.id, body: trimmed }).unwrap();
      cancelEditing();
    } catch {
      setEditError(t("Notes.updateNoteError"));
    }
  };

  const removeNote = async (note: ApartmentNote) => {
    setListError(null);
    setDeletingNoteId(note.id);

    try {
      await deleteNote({ unitId: apartment.id, noteId: note.id }).unwrap();
      if (editingNote?.id === note.id) {
        cancelEditing();
      }
    } catch {
      setListError(t("Notes.deleteNoteError"));
    } finally {
      setDeletingNoteId(null);
    }
  };

  const confirmDelete = (note: ApartmentNote) => {
    Alert.alert(
      t("Notes.deleteConfirmTitle"),
      t("Notes.deleteConfirmBody"),
      [
        { text: t("Common.cancel"), style: "cancel" },
        {
          text: t("Common.remove"),
          style: "destructive",
          onPress: () => {
            void removeNote(note);
          },
        },
      ]
    );
  };

  const handleRefresh = () => {
    void refetch();
    void onRefresh?.();
  };

  return (
    <>
      <FlatList
        data={data}
        keyExtractor={(note) => String(note.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        refreshing={Boolean(refreshing || isFetching)}
        onRefresh={handleRefresh}
        onScroll={onContentScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <View style={[styles.timelineHeader, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
            <View style={[styles.headerTop, rowDirectionStyle(isRtl)]}>
              <View style={styles.headerCopy}>
                <Typography variant="label" color="primary">
                  {t("Notes.label")}
                </Typography>
                <Typography variant="h3" style={[styles.headerTitle, textDirectionStyle(isRtl)]}>
                  {t("Notes.timelineTitle", { defaultValue: "Unit timeline" })}
                </Typography>
                <Typography variant="caption" color="secondary" style={textDirectionStyle(isRtl)}>
                  {t("Notes.notesCount", { count: data.length, defaultValue: `${data.length} notes` })}
                </Typography>
              </View>
              <Button
                title={t("Notes.addNote")}
                onPress={openAddSheet}
                style={styles.headerButton}
                leftIcon="plus"
              />
            </View>
            {isLoading ? <ActivityIndicator color={colors.primary[isDark ? "dark" : "light"]} style={styles.loader} /> : null}
            {listError ? <Typography variant="error" style={styles.error}>{listError}</Typography> : null}
          </View>
        }
        ListEmptyComponent={<EmptyState t={t} isRtl={isRtl} />}
        renderItem={({ item }) => (
          <NoteRow
            note={item}
            isDark={isDark}
            isRtl={isRtl}
            isDeleting={deletingNoteId === item.id}
            onEdit={() => startEditing(item)}
            onDelete={() => confirmDelete(item)}
            t={t}
          />
        )}
      />

      {showAddSheet ? (
        <AddNoteSheet
          body={body}
          error={composerError}
          isDark={isDark}
          isRtl={isRtl}
          isSaving={appendState.isLoading}
          onBodyChange={(nextBody) => {
            setBody(nextBody);
            if (composerError) {
              setComposerError(null);
            }
          }}
          onCancel={closeAddSheet}
          onSave={() => {
            void submit();
          }}
          t={t}
        />
      ) : null}

      {editingNote ? (
        <EditNoteSheet
          body={editingBody}
          error={editError}
          isDark={isDark}
          isRtl={isRtl}
          isSaving={updateState.isLoading}
          onBodyChange={setEditingBody}
          onCancel={cancelEditing}
          onSave={() => {
            void submitEdit();
          }}
          t={t}
        />
      ) : null}
    </>
  );
}

function AddNoteSheet({
  body,
  error,
  isDark,
  isRtl,
  isSaving,
  onBodyChange,
  onCancel,
  onSave,
  t,
}: {
  body: string;
  error: string | null;
  isDark: boolean;
  isRtl: boolean;
  isSaving: boolean;
  onBodyChange: (b: string) => void;
  onCancel: () => void;
  onSave: () => void;
  t: any;
}) {
  return (
    <BottomSheet
      onClose={onCancel}
      header={
        <>
          <Typography variant="label" color="primary">
            {t("Notes.label")}
          </Typography>
          <Typography variant="h2" style={{ marginTop: spacing.xs }}>
            {t("Notes.addTimelineEntry")}
          </Typography>
          <Typography variant="body" color="secondary" style={{ marginTop: spacing.xs }}>
            {t("Notes.helper")}
          </Typography>
        </>
      }
      footer={
        <View style={[styles.rowActions, rowDirectionStyle(isRtl)]}>
          <Button title={t("Common.cancel")} variant="ghost" onPress={onCancel} disabled={isSaving} style={styles.rowActionButton} />
          <Button
            title={isSaving ? t("Notes.adding") : t("Notes.addNote")}
            onPress={onSave}
            disabled={!body.trim() || isSaving}
            style={styles.rowActionButton}
          />
        </View>
      }
    >
      <View>
        <TextInput
          multiline
          accessibilityLabel={t("Notes.label")}
          placeholder={t("Notes.placeholder")}
          placeholderTextColor={colors.text.secondary[isDark ? "dark" : "light"]}
          value={body}
          onChangeText={onBodyChange}
          style={[
            styles.input,
            styles.sheetInput,
            {
              backgroundColor: colors.surfaceMuted[isDark ? "dark" : "light"],
              borderColor: colors.border[isDark ? "dark" : "light"],
              color: colors.text.primary[isDark ? "dark" : "light"],
              textAlign: isRtl ? "right" : "left",
            },
          ]}
          textAlignVertical="top"
        />
        {error ? <Typography variant="error" style={styles.error}>{error}</Typography> : null}
      </View>
    </BottomSheet>
  );
}

function EditNoteSheet({
  body,
  error,
  isDark,
  isRtl,
  isSaving,
  onBodyChange,
  onCancel,
  onSave,
  t,
}: {
  body: string;
  error: string | null;
  isDark: boolean;
  isRtl: boolean;
  isSaving: boolean;
  onBodyChange: (b: string) => void;
  onCancel: () => void;
  onSave: () => void;
  t: any;
}) {
  return (
    <BottomSheet
      onClose={onCancel}
      header={
        <>
          <Typography variant="label" color="primary">
            {t("Notes.editTitle")}
          </Typography>
          <Typography variant="h2" style={{ marginTop: spacing.xs }}>
            {t("Notes.editSubtitle")}
          </Typography>
          <Typography variant="body" color="secondary" style={{ marginTop: spacing.xs }}>
            {t("Notes.editHelper")}
          </Typography>
        </>
      }
      footer={
          <View style={[styles.rowActions, rowDirectionStyle(isRtl)]}>
            <Button title={t("Common.cancel")} variant="ghost" onPress={onCancel} disabled={isSaving} style={styles.rowActionButton} />
            <Button
              title={isSaving ? t("Notes.saving") : t("Notes.saveChanges")}
              onPress={onSave}
              disabled={!body.trim() || isSaving}
              style={styles.rowActionButton}
            />
          </View>
      }
    >
      <View>
        <TextInput
          multiline
          accessibilityLabel={t("Notes.editTitle")}
          placeholder={t("Notes.updatePlaceholder")}
          placeholderTextColor={colors.text.secondary[isDark ? "dark" : "light"]}
          value={body}
          onChangeText={onBodyChange}
          style={[
            styles.input,
            styles.sheetInput,
            {
              backgroundColor: colors.surfaceMuted[isDark ? "dark" : "light"],
              borderColor: colors.border[isDark ? "dark" : "light"],
              color: colors.text.primary[isDark ? "dark" : "light"],
              textAlign: isRtl ? "right" : "left",
            },
          ]}
          textAlignVertical="top"
        />
        {error ? <Typography variant="error" style={styles.error}>{error}</Typography> : null}
      </View>
    </BottomSheet>
  );
}

function NoteRow({
  note,
  isDark,
  isRtl,
  isDeleting,
  onEdit,
  onDelete,
  t,
}: {
  note: ApartmentNote;
  isDark: boolean;
  isRtl: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  t: any;
}) {
  const actionColor = colors.primary[isDark ? "dark" : "light"];

  return (
    <View
      style={[
        styles.note,
        {
          backgroundColor: colors.surface[isDark ? "dark" : "light"],
          borderColor: colors.border[isDark ? "dark" : "light"],
        },
        textDirectionStyle(isRtl)
      ]}
    >
      <Typography variant="body">{note.body}</Typography>
      <Typography variant="caption" color="secondary" style={{ marginTop: spacing.sm }}>
        {note.author?.name ?? t("Common.relations.resident")} · {formatDate(note.createdAt, t)}
      </Typography>
      <View style={[styles.noteActions, rowDirectionStyle(isRtl)]}>
        <Pressable
          accessibilityLabel={t("Common.edit")}
          accessibilityRole="button"
          hitSlop={12}
          onPress={onEdit}
          style={({ pressed }) => [styles.actionChip, pressed && styles.pressedChip]}
        >
          <Typography variant="bodyStrong" style={{ color: actionColor }}>{t("Common.edit")}</Typography>
        </Pressable>
        <Pressable
          accessibilityLabel={t("Common.remove")}
          accessibilityRole="button"
          disabled={isDeleting}
          hitSlop={12}
          onPress={onDelete}
          style={({ pressed }) => [styles.actionChip, pressed && styles.pressedChip, isDeleting && styles.disabledChip]}
        >
          <Typography variant="bodyStrong" style={{ color: colors.error }}>{isDeleting ? t("Notes.deleting") : t("Common.remove")}</Typography>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyState({ t, isRtl }: { t: any, isRtl: boolean }) {
  const isDark = useColorScheme() === "dark";

  return (
    <View style={[styles.empty, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }, textDirectionStyle(isRtl)]}>
      <Typography variant="h3">{t("Notes.noNotes")}</Typography>
      <Typography variant="body" color="secondary" style={{ marginTop: spacing.xs }}>
        {t("Notes.noNotesHint")}
      </Typography>
    </View>
  );
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
    padding: spacing.md,
  },
  timelineHeader: {
    borderRadius: radii.xl,
    padding: spacing.md,
    ...shadows.sm,
  },
  headerTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    marginTop: spacing.xs,
  },
  headerButton: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  input: {
    ...typography.body,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginTop: spacing.md,
    minHeight: 116,
    padding: spacing.md,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  rowActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  rowActionButton: {
    flex: 1,
  },
  loader: {
    marginTop: spacing.md,
  },
  error: {
    marginTop: spacing.sm,
  },
  sheetInput: {
    minHeight: 156,
  },
  note: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
  },
  noteActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionChip: {
    alignItems: "center",
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 76,
    paddingHorizontal: spacing.md,
  },
  pressedChip: {
    opacity: 0.64,
  },
  disabledChip: {
    opacity: 0.5,
  },
  empty: {
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
});
