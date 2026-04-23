"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateSettings } from "@/lib/api";

// Keys that should be treated as comma-separated arrays
const ARRAY_KEYS = new Set([
  "allowed_extensions",
  "checklist_items",
  "default_categories",
  "accepted_payment_methods",
]);

export async function updateSettingsAction(namespace: string, formData: FormData): Promise<void> {
  const rawEntries = Array.from(formData.entries()).filter(([key]) => !key.startsWith("_"));

  const settings: Record<string, unknown> = {};
  for (const [key, raw] of rawEntries) {
    const val = raw.toString().trim();

    if (ARRAY_KEYS.has(key)) {
      // Split on comma, trim whitespace, remove empty entries
      settings[key] = val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (val === "true") {
      settings[key] = true;
    } else if (val === "false") {
      settings[key] = false;
    } else if (val !== "" && !isNaN(Number(val))) {
      settings[key] = Number(val);
    } else {
      settings[key] = val;
    }
  }

  const compoundId = (formData.get("_compoundId") as string | null) || undefined;
  const reason = (formData.get("_reason") as string | null) || undefined;

  await updateSettings(namespace, {
    settings,
    compoundId: compoundId ?? null,
    reason,
  });

  revalidatePath("/settings");
  redirect(`/settings?updated=${namespace}`);
}
