import { NextResponse } from "next/server";

import { config } from "@/lib/config";
import { getAuthToken } from "@/lib/session";

export async function POST(request: Request) {
  const token = await getAuthToken();

  if (!token) {
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  }

  const apiOrigin = new URL(config.apiBaseUrl).origin;
  const body = await request.text();
  const response = await fetch(`${apiOrigin}/broadcasting/auth`, {
    body,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": request.headers.get("content-type") ?? "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  const text = await response.text();

  return new NextResponse(text, {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
    status: response.status,
  });
}
