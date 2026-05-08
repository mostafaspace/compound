import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { Button } from "../../../../components/ui/Button";
import { colors, radii, shadows, spacing, typography } from "../../../../theme";
import {
  useAppendNoteMutation,
  useDeleteNoteMutation,
  useListNotesQuery,
  useUpdateNoteMutation,
} from "../../../../services/apartments/notesApi";
import type { ApartmentDetail, ApartmentNote } from "../../../../services/apartments/types";

export function NotesTab({ apartment }: { apartment: ApartmentDetail }) {
  const isDark = useColorScheme() === "dark";
  const [body, setBody] = useState("");
  const [composerError, setComposerError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<ApartmentNote | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);
  const { data = apartment.recentNotes, isLoading } = useListNotesQuery(apartment.id);
  const [appendNote, appendState] = useAppendNoteMutation();
  const [updateNote, updateState] = useUpdateNoteMutation();
  const [deleteNote] = useDeleteNoteMutation();

  const submit = async () => {
    const trimmed = body.trim();

    if (!trimmed) {
      return;
    }

    setComposerError(null);

    try {
      await appendNote({ unitId: apartment.id, body: trimmed }).unwrap();
      setBody("");
    } catch {
      setComposerError("Could not add note. Please try again.");
    }
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
      setEditError("Note body is required.");
      return;
    }

    setEditError(null);

    try {
      await updateNote({ unitId: apartment.id, noteId: editingNote.id, body: trimmed }).unwrap();
      cancelEditing();
    } catch {
      setEditError("Could not update note. Please try again.");
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
      setListError("Could not delete note. Please try again.");
    } finally {
      setDeletingNoteId(null);
    }
  };

  const confirmDelete = (note: ApartmentNote) => {
    Alert.alert(
      "Delete note?",
      "This removes the note from this apartment timeline.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void removeNote(note);
          },
        },
      ]
    );
  };

  return (
    <>
      <FlatList
        data={data}
        keyExtractor={(note) => String(note.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={[styles.composer, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
            <Text style={[styles.eyebrow, { color: colors.primary[isDark ? "dark" : "light"] }]}>
              Apartment notes
            </Text>
            <Text style={[styles.title, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
              Add a timeline entry
            </Text>
            <Text style={[styles.helper, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
              Create a new note here. Existing notes have their own Edit and Delete actions below.
            </Text>
            <TextInput
              multiline
              accessibilityLabel="New apartment note"
              placeholder="Add a dated note for this apartment..."
              placeholderTextColor={colors.text.secondary[isDark ? "dark" : "light"]}
              value={body}
              onChangeText={setBody}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceMuted[isDark ? "dark" : "light"],
                  borderColor: colors.border[isDark ? "dark" : "light"],
                  color: colors.text.primary[isDark ? "dark" : "light"],
                },
              ]}
              textAlignVertical="top"
            />
            {composerError ? <Text style={styles.error}>{composerError}</Text> : null}
            <Button
              title={appendState.isLoading ? "Adding..." : "Add note"}
              onPress={() => {
                void submit();
              }}
              disabled={!body.trim() || appendState.isLoading}
              style={styles.submitButton}
            />
            {isLoading ? <ActivityIndicator color={colors.primary[isDark ? "dark" : "light"]} style={styles.loader} /> : null}
            {listError ? <Text style={styles.error}>{listError}</Text> : null}
          </View>
        }
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <NoteRow
            note={item}
            isDark={isDark}
            isDeleting={deletingNoteId === item.id}
            onEdit={() => startEditing(item)}
            onDelete={() => confirmDelete(item)}
          />
        )}
      />

      {editingNote ? (
        <EditNoteSheet
          body={editingBody}
          error={editError}
          isDark={isDark}
          isSaving={updateState.isLoading}
          onBodyChange={setEditingBody}
          onCancel={cancelEditing}
          onSave={() => {
            void submitEdit();
          }}
        />
      ) : null}
    </>
  );
}

function EditNoteSheet({
  body,
  error,
  isDark,
  isSaving,
  onBodyChange,
  onCancel,
  onSave,
}: {
  body: string;
  error: string | null;
  isDark: boolean;
  isSaving: boolean;
  onBodyChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.sheetBackdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
          <View style={styles.handle} />
          <Text style={[styles.sheetEyebrow, { color: colors.primary[isDark ? "dark" : "light"] }]}>
            Edit note
          </Text>
          <Text style={[styles.sheetTitle, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
            Update timeline entry
          </Text>
          <Text style={[styles.sheetCopy, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
            Changes are saved back to this apartment note. Use Delete from the note card if you want to remove it.
          </Text>
          <TextInput
            multiline
            accessibilityLabel="Edit apartment note"
            placeholder="Update this note..."
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
              },
            ]}
            textAlignVertical="top"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.rowActions}>
            <Button title="Cancel" variant="ghost" onPress={onCancel} disabled={isSaving} style={styles.rowActionButton} />
            <Button
              title={isSaving ? "Saving..." : "Save changes"}
              onPress={onSave}
              disabled={!body.trim() || isSaving}
              style={styles.rowActionButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NoteRow({
  note,
  isDark,
  isDeleting,
  onEdit,
  onDelete,
}: {
  note: ApartmentNote;
  isDark: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
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
      ]}
    >
      <Text style={[styles.noteBody, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>{note.body}</Text>
      <Text style={[styles.noteMeta, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
        {note.author?.name ?? "Resident"} · {formatDate(note.createdAt)}
      </Text>
      <View style={styles.noteActions}>
        <Pressable
          accessibilityLabel={`Edit note from ${formatDate(note.createdAt)}`}
          accessibilityRole="button"
          hitSlop={12}
          onPress={onEdit}
          style={({ pressed }) => [styles.actionChip, pressed && styles.pressedChip]}
        >
          <Text style={[styles.noteActionText, { color: actionColor }]}>Edit</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`Delete note from ${formatDate(note.createdAt)}`}
          accessibilityRole="button"
          disabled={isDeleting}
          hitSlop={12}
          onPress={onDelete}
          style={({ pressed }) => [styles.actionChip, pressed && styles.pressedChip, isDeleting && styles.disabledChip]}
        >
          <Text style={[styles.noteActionText, { color: colors.error }]}>{isDeleting ? "Deleting..." : "Delete"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyState() {
  const isDark = useColorScheme() === "dark";

  return (
    <View style={[styles.empty, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
      <Text style={[styles.emptyTitle, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
        No notes yet
      </Text>
      <Text style={[styles.emptyBody, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
        Add notes for resident, vehicle, parking, or document context. You can edit or delete entries later.
      </Text>
    </View>
  );
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
  composer: {
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
  helper: {
    ...typography.body,
    marginTop: spacing.xs,
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
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.sm,
  },
  sheetBackdrop: {
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
  sheetEyebrow: {
    ...typography.label,
  },
  sheetTitle: {
    ...typography.h2,
    marginTop: spacing.xs,
  },
  sheetCopy: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  sheetInput: {
    minHeight: 156,
  },
  note: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
  },
  noteBody: {
    ...typography.body,
  },
  noteMeta: {
    ...typography.caption,
    marginTop: spacing.sm,
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
  noteActionText: {
    ...typography.bodyStrong,
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
});
