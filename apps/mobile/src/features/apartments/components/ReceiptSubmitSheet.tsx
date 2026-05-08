import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { pick, types } from "@react-native-documents/picker";
import type { LedgerEntry } from "@compound/contracts";
import { Button } from "../../../components/ui/Button";
import { colors, radii, shadows, spacing, typography } from "../../../theme";
import { useSubmitPaymentMutation } from "../../../services/finance";
import type { UploadFile } from "../../../services/apartments/types";

const PAYMENT_METHODS = ["bank_transfer", "cash", "check"] as const;

export function ReceiptSubmitSheet({
  accountId,
  currency,
  selectedEntries,
  onClose,
  onSubmitted,
}: {
  accountId: string;
  currency: string;
  selectedEntries: LedgerEntry[];
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const isDark = useColorScheme() === "dark";
  const defaultAmount = useMemo(() => selectedEntries.reduce((sum, entry) => sum + Number(entry.amount), 0).toFixed(2), [
    selectedEntries,
  ]);
  const [amount, setAmount] = useState(defaultAmount);
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [proof, setProof] = useState<UploadFile | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitPayment, submitState] = useSubmitPaymentMutation();

  const chooseProof = async () => {
    try {
      const [result] = await pick({
        allowMultiSelection: false,
        type: [types.images, types.pdf],
      });

      setProof({
        uri: result.uri,
        name: result.name ?? "receipt",
        type: result.type ?? "application/octet-stream",
      });
    } catch {
      // User cancelled the native picker.
    }
  };

  const submit = async () => {
    if (!amount.trim() || Number(amount) <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }

    if (!proof) {
      setMessage("Attach a receipt screenshot or PDF before submitting.");
      return;
    }

    const formData = new FormData();
    formData.append("amount", amount.trim());
    formData.append("currency", currency);
    formData.append("method", method);
    selectedEntries.forEach((entry) => formData.append("ledger_entry_ids[]", String(entry.id)));

    if (reference.trim()) {
      formData.append("reference", reference.trim());
    }

    if (notes.trim()) {
      formData.append("notes", notes.trim());
    }

    formData.append("proof", {
      uri: proof.uri,
      name: proof.name,
      type: proof.type,
    } as never);

    setMessage(null);

    try {
      await submitPayment({ accountId, body: formData }).unwrap();
      onSubmitted();
    } catch {
      setMessage("Could not submit receipt. Please check the details and try again.");
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface[isDark ? "dark" : "light"] }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
            Submit receipt
          </Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary[isDark ? "dark" : "light"] }]}>
            This creates a payment submission for admin review against {selectedEntries.length} selected charge
            {selectedEntries.length === 1 ? "" : "s"}.
          </Text>

          <ScrollView keyboardShouldPersistTaps="handled" style={styles.form} contentContainerStyle={styles.formContent}>
            <Text style={[styles.label, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>Amount</Text>
            <TextInput
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.text.secondary[isDark ? "dark" : "light"]}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceMuted[isDark ? "dark" : "light"],
                  borderColor: colors.border[isDark ? "dark" : "light"],
                  color: colors.text.primary[isDark ? "dark" : "light"],
                },
              ]}
            />

            <Text style={[styles.label, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>Method</Text>
            <View style={styles.methodRow}>
              {PAYMENT_METHODS.map((paymentMethod) => {
                const selected = method === paymentMethod;

                return (
                  <Pressable
                    key={paymentMethod}
                    onPress={() => setMethod(paymentMethod)}
                    style={[
                      styles.methodChip,
                      {
                        backgroundColor: selected
                          ? colors.primary[isDark ? "dark" : "light"]
                          : colors.surfaceMuted[isDark ? "dark" : "light"],
                        borderColor: selected ? "transparent" : colors.border[isDark ? "dark" : "light"],
                      },
                    ]}
                  >
                    <Text style={[styles.methodText, { color: selected ? colors.text.inverse : colors.text.primary[isDark ? "dark" : "light"] }]}>
                      {formatMethod(paymentMethod)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>Reference</Text>
            <TextInput
              value={reference}
              onChangeText={setReference}
              placeholder="Transfer reference, check number..."
              placeholderTextColor={colors.text.secondary[isDark ? "dark" : "light"]}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceMuted[isDark ? "dark" : "light"],
                  borderColor: colors.border[isDark ? "dark" : "light"],
                  color: colors.text.primary[isDark ? "dark" : "light"],
                },
              ]}
            />

            <Text style={[styles.label, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>Notes</Text>
            <TextInput
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional note for the finance team"
              placeholderTextColor={colors.text.secondary[isDark ? "dark" : "light"]}
              textAlignVertical="top"
              style={[
                styles.input,
                styles.notesInput,
                {
                  backgroundColor: colors.surfaceMuted[isDark ? "dark" : "light"],
                  borderColor: colors.border[isDark ? "dark" : "light"],
                  color: colors.text.primary[isDark ? "dark" : "light"],
                },
              ]}
            />

            <Pressable
              onPress={chooseProof}
              style={[
                styles.proofPicker,
                {
                  backgroundColor: colors.surfaceMuted[isDark ? "dark" : "light"],
                  borderColor: colors.border[isDark ? "dark" : "light"],
                },
              ]}
            >
              <Text style={[styles.proofText, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>
                {proof?.name ?? "Attach receipt screenshot or PDF"}
              </Text>
            </Pressable>

            {message ? <Text style={styles.error}>{message}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <Button title="Cancel" variant="ghost" onPress={onClose} disabled={submitState.isLoading} style={styles.actionButton} />
            <Button
              title={submitState.isLoading ? "Submitting..." : "Submit"}
              onPress={() => {
                void submit();
              }}
              disabled={submitState.isLoading}
              style={styles.actionButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function formatMethod(method: string): string {
  return method.replace(/_/g, " ");
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
    maxHeight: "90%",
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
    marginTop: spacing.xs,
  },
  form: {
    marginTop: spacing.md,
  },
  formContent: {
    paddingBottom: spacing.sm,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    ...typography.body,
    borderRadius: radii.lg,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  notesInput: {
    minHeight: 84,
  },
  methodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  methodChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  methodText: {
    ...typography.caption,
    textTransform: "capitalize",
  },
  proofPicker: {
    alignItems: "center",
    borderRadius: radii.xl,
    borderStyle: "dashed",
    borderWidth: 1,
    justifyContent: "center",
    marginTop: spacing.md,
    minHeight: 84,
    padding: spacing.md,
  },
  proofText: {
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
