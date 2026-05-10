"use server";

import { revalidatePath } from "next/cache";

import { config } from "@/lib/config";
import { getAuthToken, getCompoundContext } from "@/lib/session";

export interface RunImportResult {
  success: boolean;
  batchId?: string;
  error?: string;
}

export async function runImportAction(formData: FormData): Promise<RunImportResult> {
  const token = await getAuthToken();
  const compoundId = await getCompoundContext();

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (compoundId) headers["X-Compound-Id"] = compoundId;

  // Forward form data as-is (multipart/form-data) — do NOT set Content-Type manually
  try {
    const response = await fetch(`${config.apiBaseUrl}/imports`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };

      return { success: false, error: body.message ?? "Import failed." };
    }

    const payload = (await response.json()) as { data: { id: string } };

    revalidatePath("/imports");

    return { success: true, batchId: payload.data.id };
  } catch {
    return { success: false, error: "Network error. Check API availability." };
  }
}
