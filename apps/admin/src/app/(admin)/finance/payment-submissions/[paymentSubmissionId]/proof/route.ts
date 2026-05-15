import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/api";
import { config } from "@/lib/config";
import { getAuthToken, getCompoundContext, requireAdminUser } from "@/lib/session";

interface ProofRouteProps {
  params: Promise<{
    paymentSubmissionId: string;
  }>;
}

export async function GET(_request: Request, { params }: ProofRouteProps) {
  await requireAdminUser(getCurrentUser);

  const { paymentSubmissionId } = await params;
  const token = await getAuthToken();
  const compoundId = await getCompoundContext();
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (compoundId) {
    headers["X-Compound-Id"] = compoundId;
  }

  const response = await fetch(`${config.apiBaseUrl}/finance/payment-submissions/${paymentSubmissionId}/proof`, {
    cache: "no-store",
    headers,
  });

  if (!response.ok || !response.body) {
    return new NextResponse("Payment proof unavailable", { status: response.status });
  }

  const responseHeaders = new Headers();
  responseHeaders.set("Cache-Control", "no-store");
  responseHeaders.set("Content-Type", response.headers.get("Content-Type") ?? "application/octet-stream");
  responseHeaders.set(
    "Content-Disposition",
    response.headers.get("Content-Disposition")?.replace("attachment", "inline") ??
      `inline; filename="payment-proof-${paymentSubmissionId}"`,
  );

  return new NextResponse(response.body, {
    headers: responseHeaders,
    status: response.status,
  });
}
