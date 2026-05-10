"use server";

import { revalidatePath } from "next/cache";
import { createPollType, deletePollType } from "@/lib/api";

export async function createPollTypeAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || undefined;
  const color = String(formData.get("color") ?? "#14b8a6").trim();

  if (!name) return;

  await createPollType({ name, description, color });
  revalidatePath("/polls/types");
}

export async function deletePollTypeAction(id: string) {
  await deletePollType(id);
  revalidatePath("/polls/types");
}
