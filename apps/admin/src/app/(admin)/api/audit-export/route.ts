import { NextRequest, NextResponse } from "next/server";

import { config } from "@/lib/config";
import { getAuthToken, getCompoundContext } from "@/lib/session";

export async function GET(request: NextRequest) {
  const token = await getAuthToken();

  if (!token) {
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  }

  const compoundId = await getCompoundContext();

  // Forward all filter query params to the backend export endpoint
  const searchParams = request.nextUrl.searchParams.toString();
  const upstreamUrl = `${config.apiBaseUrl}/audit-logs/export${searchParams ? `?${searchParams}` : ""}`;

  const headers: Record<string, string> = {
    Accept: "text/csv",
    Authorization: `Bearer ${token}`,
  };

  if (compoundId) {
    headers["X-Compound-Id"] = compoundId;
  }

  const upstream = await fetch(upstreamUrl, {
    cache: "no-store",
    headers,
    method: "GET",
  });

  if (!upstream.ok) {
    return NextResponse.json({ message: "Export failed." }, { status: upstream.status });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Disposition": upstream.headers.get("Content-Disposition") ?? 'attachment; filename="audit-export.csv"',
      "Content-Type": "text/csv; charset=UTF-8",
    },
    status: 200,
  });
}
