"use server";

import { redirect } from "next/navigation";

import { login } from "@/lib/api";
import { setAuthToken, setCompoundContext } from "@/lib/session";

export async function loginAction(formData: FormData) {
  let destination = "/";

  try {
    const result = await login({
      deviceName: "Compound admin web",
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    await setAuthToken(result.token);

    // Compound admins are scoped to a single compound — pre-set context so
    // every subsequent API call sends the correct X-Compound-Id header.
    if (result.user.role === "compound_admin" && result.user.compoundId) {
      await setCompoundContext(result.user.compoundId);
      destination = `/compounds/${result.user.compoundId}`;
    }
  } catch {
    redirect("/login?error=invalid");
  }

  redirect(destination);
}
