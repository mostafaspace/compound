"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { closePoll, publishPoll } from "@/lib/api";

export async function publishPollAction(pollId: string) {
  await publishPoll(pollId);
  revalidatePath("/polls");
  redirect("/polls?published=1");
}

export async function closePollAction(pollId: string) {
  await closePoll(pollId);
  revalidatePath("/polls");
  redirect(`/polls/${pollId}?closed=1`);
}
