"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { closePoll, publishPoll } from "@/lib/api";

export async function publishPollDetailAction(pollId: string) {
  await publishPoll(pollId);
  revalidatePath(`/polls/${pollId}`);
  redirect(`/polls/${pollId}?published=1`);
}

export async function closePollDetailAction(pollId: string) {
  await closePoll(pollId);
  revalidatePath(`/polls/${pollId}`);
  redirect(`/polls/${pollId}?closed=1`);
}
