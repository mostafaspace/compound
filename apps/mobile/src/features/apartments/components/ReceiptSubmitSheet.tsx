import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { pick, types } from "@react-native-documents/picker";
import type { LedgerEntry } from "@compound/contracts";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { Button } from "../../../components/ui/Button";
import { Typography } from "../../../components/ui/Typography";
import { colors, radii, spacing, typography } from "../../../theme";
import { useSubmitPaymentMutation } from "../../../services/finance";
import type { UploadFile } from "../../../services/apartments/types";

const PAYMENT_METHODS = ["cash", "bank_transfer", "check"] as const;

export function ReceiptSubmitSheet({
  accountId,
  unitId,
  currency,
  selectedEntries,
  onClose,
  onSubmitted,
}: {
  accountId: string;
  unitId?: string;
  currency: string;
  selectedEntries: LedgerEntry[];
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const isDark = useColorScheme() === "dark";
  const amount = useMemo(() => selectedEntries.reduce((sum, entry) => sum + Number(entry.amount), 0).toFixed(2), [
    selectedEntries,
  ]);
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [proof, setProof] = useState<UploadFile | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitPayment, submitState] = useSubmitPaymentMutation();
  const renderPaymentMethod = ({ item: paymentMethod }: { item: (typeof PAYMENT_METHODS)[number] }) => {
    const selected = method === paymentMethod;

    return (
      <Pressable
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
  };

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
      await submitPayment({ accountId, unitId, body: formData }).unwrap();
      onSubmitted();
    } catch (err: any) {
      setMessage(err?.data?.message || err?.message || "Could not submit receipt. Please check the details and try again.");
    }
  };

  return (
    <BottomSheet
      title="Submit contribution receipt"
      subtitle={`This creates a contribution submission for review against ${selectedEntries.length} selected charge${selectedEntries.length === 1 ? "" : "s"}.`}
      maxHeight="90%"
      onClose={onClose}
      footer={
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
      }
    >
      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>Total Amount</Text>
        <View
          style={[
            styles.amountLabel,
            {
              backgroundColor: colors.surfaceMuted[isDark ? "dark" : "light"],
              borderColor: colors.border[isDark ? "dark" : "light"],
            },
          ]}
        >
          <Typography variant="h3" style={{ color: colors.text.primary[isDark ? "dark" : "light"] }}>
            {amount} <Typography variant="caption">{currency}</Typography>
          </Typography>
        </View>

        <Text style={[styles.label, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>Method</Text>
        <FlatList
          data={PAYMENT_METHODS}
          keyExtractor={(paymentMethod) => paymentMethod}
          renderItem={renderPaymentMethod}
          horizontal
          scrollEnabled={false}
          contentContainerStyle={styles.methodRow}
        />

        <Text style={[styles.label, { color: colors.text.primary[isDark ? "dark" : "light"] }]}>Reference</Text>
        <TextInput
          value={reference}
          onChangeText={setReference}
          placeholder="Instapay reference, transfer, or cheque..."
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
      </View>
    </BottomSheet>
  );
}

function formatMethod(method: string): string {
  if (method === "cash") return "Instapay";
  return method.replace(/_/g, " ");
}

const styles = StyleSheet.create({
  form: {
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
  amountLabel: {
    borderRadius: radii.lg,
    borderWidth: 1,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
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
  },
  actionButton: {
    flex: 1,
  },
});
