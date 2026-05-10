"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { config } from "@/lib/config";
import { getAuthToken, getCompoundContext } from "@/lib/session";

async function notifHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const compoundId = await getCompoundContext();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (compoundId) {
    headers["X-Compound-Id"] = compoundId;
  }

  return headers;
}

function asOptionalString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export async function upsertNotificationTemplateAction(formData: FormData) {
  const headers = await notifHeaders();
  const templateId = asOptionalString(formData.get("template_id"));
  const compoundId = asOptionalString(formData.get("compound_id"));

  const response = await fetch(
    templateId
      ? `${config.apiBaseUrl}/notification-templates/${templateId}`
      : `${config.apiBaseUrl}/notification-templates`,
    {
      method: templateId ? "PATCH" : "POST",
      headers,
      body: JSON.stringify({
        compound_id: compoundId,
        category: formData.get("category"),
        channel: formData.get("channel"),
        locale: formData.get("locale"),
        subject: asOptionalString(formData.get("subject")),
        title_template: formData.get("title_template"),
        body_template: formData.get("body_template"),
        is_active: formData.get("is_active") === "true",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to save notification template: ${response.status}`);
  }

  revalidatePath("/notifications/channels");
  redirect(`/notifications/channels?updated=${templateId ? "template-updated" : "template-created"}`);
}

export async function toggleTemplateActiveAction(templateId: string, formData: FormData) {
  const headers = await notifHeaders();

  const response = await fetch(`${config.apiBaseUrl}/notification-templates/${templateId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      compound_id: asOptionalString(formData.get("compound_id")),
      category: formData.get("category"),
      channel: formData.get("channel"),
      locale: formData.get("locale"),
      subject: asOptionalString(formData.get("subject")),
      title_template: formData.get("title_template"),
      body_template: formData.get("body_template"),
      is_active: formData.get("is_active") === "true",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update notification template: ${response.status}`);
  }

  revalidatePath("/notifications/channels");
  redirect("/notifications/channels?updated=template-status");
}

export async function retryDeliveryAction(logId: string) {
  const headers = await notifHeaders();

  const response = await fetch(`${config.apiBaseUrl}/notification-delivery-logs/${logId}/retry`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`Failed to retry delivery log: ${response.status}`);
  }

  revalidatePath("/notifications/channels");
  redirect("/notifications/channels?updated=delivery-retried");
}
