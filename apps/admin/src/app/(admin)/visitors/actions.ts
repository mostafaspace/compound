"use server";

import type { VisitorPassValidationResult, VisitorRequest } from "@compound/contracts";
import { revalidatePath } from "next/cache";

import {
  allowVisitorRequest,
  arriveVisitorRequest,
  cancelVisitorRequest,
  completeVisitorRequest,
  denyVisitorRequest,
  validateVisitorPass,
} from "@/lib/api";

export async function validateVisitorPassAction(token: string): Promise<VisitorPassValidationResult> {
  return validateVisitorPass(token.trim());
}

export async function visitorDecisionAction(
  visitorRequestId: string,
  action: "arrive" | "allow" | "deny" | "complete" | "cancel",
  reason?: string,
): Promise<VisitorRequest> {
  const input = { reason: reason?.trim() || undefined };
  let visitorRequest: VisitorRequest;

  switch (action) {
    case "arrive":
      visitorRequest = await arriveVisitorRequest(visitorRequestId);
      break;
    case "allow":
      visitorRequest = await allowVisitorRequest(visitorRequestId);
      break;
    case "deny":
      visitorRequest = await denyVisitorRequest(visitorRequestId, input);
      break;
    case "complete":
      visitorRequest = await completeVisitorRequest(visitorRequestId);
      break;
    case "cancel":
      visitorRequest = await cancelVisitorRequest(visitorRequestId, input);
      break;
  }

  revalidatePath("/visitors");

  return visitorRequest;
}
