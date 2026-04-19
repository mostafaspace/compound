"use server";

import { redirect } from "next/navigation";

import { logout } from "@/lib/api";
import { clearAuthToken } from "@/lib/session";

export async function logoutAction() {
  try {
    await logout();
  } finally {
    await clearAuthToken();
  }

  redirect("/login");
}
