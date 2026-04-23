"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { IssueStatus } from "@compound/contracts";

import { createIssueComment, escalateIssue, updateIssue } from "@/lib/api";

export async function updateIssueStatusAction(issueId: string, formData: FormData) {
  const status = formData.get("status") as string;

  await updateIssue(issueId, { status: status as IssueStatus });

  revalidatePath(`/issues/${issueId}`);
  redirect(`/issues/${issueId}?updated=1`);
}

export async function assignIssueAction(issueId: string, formData: FormData) {
  const assignedTo = formData.get("assignedTo") as string;
  const value = assignedTo ? Number(assignedTo) : null;

  await updateIssue(issueId, { assignedTo: value });

  revalidatePath(`/issues/${issueId}`);
  redirect(`/issues/${issueId}?assigned=1`);
}

export async function postCommentAction(issueId: string, formData: FormData) {
  const body = formData.get("body") as string;
  const isInternal = formData.get("isInternal") === "1";

  await createIssueComment(issueId, body, isInternal);

  revalidatePath(`/issues/${issueId}`);
  redirect(`/issues/${issueId}?commented=1`);
}

export async function escalateIssueAction(issueId: string, formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim();

  await escalateIssue(issueId, reason);

  revalidatePath(`/issues/${issueId}`);
  redirect(`/issues/${issueId}?updated=1`);
}
