"use server";

import { redirect } from "next/navigation";

import { login } from "@/lib/api";
import { hasEffectiveRole, setAuthToken, setCompoundContext } from "@/lib/session";

export async function loginAction(formData: FormData) {
  let destination = "/";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    const result = await login({
      deviceName: "Compound admin web",
      email,
      password,
    });

    await setAuthToken(result.token);

    // Compound admins are scoped to a single compound — pre-set context so
    // every subsequent API call sends the correct X-Compound-Id header.
    if (hasEffectiveRole(result.user, "compound_admin") && result.user.compoundId) {
      await setCompoundContext(result.user.compoundId);
      destination = `/compounds/${result.user.compoundId}`;
    } else {
      await setCompoundContext(null);
    }
  } catch {
    redirect("/login?error=invalid");
  }

  redirect(destination);
}
