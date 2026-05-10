"use server";

import { revalidatePath } from "next/cache";
import { createPoll as apiCreatePoll, publishPoll, closePoll } from "@/lib/api";
import type { CreatePollInput } from "@compound/contracts";

export async function createPoll(input: CreatePollInput) {
  const poll = await apiCreatePoll(input);
  revalidatePath("/polls");
  return poll;
}

export async function publishPollAction(id: string) {
  await publishPoll(id);
  revalidatePath("/polls");
}

export async function closePollAction(id: string) {
  await closePoll(id);
  revalidatePath("/polls");
}
