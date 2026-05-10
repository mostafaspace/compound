"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { reviewDocumentVersion } from "@/lib/api";

export async function reviewDocumentVersionAction(
  versionId: number,
  decision: "approved" | "rejected",
  formData: FormData,
) {
  const notes = String(formData.get("notes") ?? "").trim();

  await reviewDocumentVersion(versionId, decision, notes || undefined);

  revalidatePath("/document-reviews");
  redirect(`/document-reviews?${decision}=1`);
}
