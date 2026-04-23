"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { activateVote, cancelVote, closeVote, createVote } from "@/lib/api";

export async function createVoteAction(formData: FormData) {
  const compoundId = String(formData.get("compoundId") ?? "").trim();
  const type = String(formData.get("type") ?? "poll") as "poll" | "election" | "decision";
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || undefined;
  const eligibility = String(formData.get("eligibility") ?? "owners_only") as
    | "owners_only"
    | "owners_and_residents"
    | "all_verified";
  const scope = String(formData.get("scope") ?? "compound") as "compound" | "building";
  const startsAt = String(formData.get("startsAt") ?? "").trim() || undefined;
  const endsAt = String(formData.get("endsAt") ?? "").trim() || undefined;

  // Collect dynamic options (option_0, option_1, ...)
  const options: Array<{ label: string }> = [];
  let i = 0;
  while (formData.has(`option_${i}`)) {
    const label = String(formData.get(`option_${i}`) ?? "").trim();
    if (label) options.push({ label });
    i++;
  }

  await createVote({ compoundId, type, title, description, eligibility, scope, startsAt, endsAt, options });

  revalidatePath("/governance");
  redirect("/governance?created=1");
}

export async function activateVoteAction(voteId: string) {
  await activateVote(voteId);
  revalidatePath("/governance");
  redirect("/governance?activated=1");
}

export async function closeVoteAction(voteId: string) {
  await closeVote(voteId);
  revalidatePath("/governance");
  redirect(`/governance/${voteId}?closed=1`);
}

export async function cancelVoteAction(voteId: string) {
  await cancelVote(voteId);
  revalidatePath("/governance");
  redirect("/governance?cancelled=1");
}
