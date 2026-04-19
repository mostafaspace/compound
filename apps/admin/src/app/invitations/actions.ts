"use server";

import { redirect } from "next/navigation";

import { acceptResidentInvitation } from "@/lib/api";

export async function acceptResidentInvitationAction(token: string, formData: FormData) {
  await acceptResidentInvitation(token, {
    name: String(formData.get("name") ?? ""),
    password: String(formData.get("password") ?? ""),
    password_confirmation: String(formData.get("password_confirmation") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });

  redirect("/login?accepted=1");
}
