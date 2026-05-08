import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { Button } from "../../../../components/ui/Button";
import { colors, radii, shadows, spacing, typography } from "../../../../theme";
import { useAppendNoteMutation, useListNotesQuery } from "../../../../services/apartments/notesApi";
import type { ApartmentDetail, ApartmentNote } from "../../../../services/apartments/types";

export function NotesTab({ apartment }: { apartment: ApartmentDetail }) {
  const isDark = useColorScheme() === "dark";
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { data = apartment.recentNotes, isLoading } = useListNotesQuery(apartment.id);
  const [appendNote, appendState] = useAppendNoteMutation();

  const submit = async () => {
    const trimmed = body.trim();

    if (!trimmed) {
      return;
    }

    setError(null);

    try {
      await appendNote({ unitId: apartment.id, body: trimmed }).unwrap();
      setBody("");
    } catch {
      setError("Could not add note. Please try again.");
    }
  };

  return (
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
          <TextInput
            multiline
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
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            title={appendState.isLoading ? "Adding..." : "Add note"}
            onPress={() => {
              void submit();
            }}
            disabled={!body.trim() || appendState.isLoading}
            style={styles.submitButton}
          />
          {isLoading ? <ActivityIndicator color={colors.primary[isDark ? "dark" : "light"]} style={styles.loader} /> : null}
        </View>
      }
      ListEmptyComponent={<EmptyState />}
      renderItem={({ item }) => <NoteRow note={item} isDark={isDark} />}
    />
  );
}

function NoteRow({ note, isDark }: { note: ApartmentNote; isDark: boolean }) {
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
        Notes are append-only in this first version, so each entry becomes part of the apartment timeline.
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
  loader: {
    marginTop: spacing.md,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.sm,
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
