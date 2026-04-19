"use server";

import type { DocumentStatus } from "@compound/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { reviewDocument, uploadDocument } from "@/lib/api";

export async function uploadDocumentAction(formData: FormData) {
  await uploadDocument(formData);

  revalidatePath("/documents");
  redirect("/documents");
}

export async function reviewDocumentAction(documentId: number, formData: FormData) {
  await reviewDocument(documentId, {
    reviewNote: String(formData.get("reviewNote") ?? ""),
    status: String(formData.get("status") ?? "under_review") as DocumentStatus,
  });

  revalidatePath("/documents");
  redirect("/documents");
}
