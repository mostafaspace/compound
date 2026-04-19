"use server";

import { redirect } from "next/navigation";

import { login } from "@/lib/api";
import { setAuthToken } from "@/lib/session";

export async function loginAction(formData: FormData) {
  try {
    const result = await login({
      deviceName: "Compound admin web",
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    await setAuthToken(result.token);
  } catch {
    redirect("/login?error=invalid");
  }

  redirect("/");
}
