"use server";

import type { DocumentStatus } from "@compound/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { reviewDocument, uploadDocument } from "@/lib/api";

export async function uploadDocumentAction(formData: FormData) {
  try {
    const userId = Number(formData.get("userId"));
    if (!Number.isInteger(userId) || userId <= 0) {
      redirect("/documents?error=upload_failed");
    }

    await uploadDocument(formData);

    revalidatePath("/documents");
    redirect("/documents?uploaded=1");
  } catch {
    redirect("/documents?error=upload_failed");
  }
}

export async function reviewDocumentAction(documentId: number, formData: FormData) {
  try {
    await reviewDocument(documentId, {
      reviewNote: String(formData.get("reviewNote") ?? ""),
      status: String(formData.get("status") ?? "under_review") as DocumentStatus,
    });

    revalidatePath("/documents");
    redirect("/documents?reviewed=1");
  } catch {
    redirect("/documents?error=review_failed");
  }
}
