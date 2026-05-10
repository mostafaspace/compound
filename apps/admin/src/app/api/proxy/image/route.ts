import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api";
import { getAuthToken, getCompoundContext, requireAdminUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    // 1. Ensure user is authenticated as admin
    await requireAdminUser(getCurrentUser);

    const imageUrl = request.nextUrl.searchParams.get("url");
    if (!imageUrl) {
      return new NextResponse("Missing URL", { status: 400 });
    }

    // 2. Fetch the image from the backend API using the user's session token
    const token = await getAuthToken();
    const compoundId = await getCompoundContext();

    const headers: Record<string, string> = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (compoundId) {
      headers["X-Compound-Id"] = compoundId;
    }

    // Map localhost to internal service name if running in Docker environment
    let targetUrl = imageUrl;
    if (targetUrl.includes("localhost:8000") && process.env.API_BASE_URL) {
      targetUrl = targetUrl.replace("http://localhost:8000/api/v1", process.env.API_BASE_URL);
    }

    const response = await fetch(targetUrl, { headers });

    if (!response.ok) {
      return new NextResponse("Failed to fetch image", { status: response.status });
    }

    const blob = await response.blob();
    return new NextResponse(blob, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
