import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api";
import { getAuthToken, getCompoundContext, requireAdminUser } from "@/lib/session";
import { config } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser(getCurrentUser);

    const requestId = request.nextUrl.searchParams.get("requestId");
    const documentId = request.nextUrl.searchParams.get("documentId");

    if (!requestId || !documentId) {
      return new NextResponse("Missing requestId or documentId", { status: 400 });
    }

    const token = await getAuthToken();
    const compoundId = await getCompoundContext();

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (compoundId) {
      headers["X-Compound-Id"] = compoundId;
    }

    const response = await fetch(
      `${config.apiBaseUrl}/owner-registration-requests/${requestId}/documents/${documentId}/download`,
      { headers },
    );

    if (!response.ok) {
      return new NextResponse("Document not found", { status: response.status });
    }

    const blob = await response.blob();
    const contentType = response.headers.get("Content-Type") || "application/pdf";
    const contentDisposition = response.headers.get("Content-Disposition");

    const responseHeaders: Record<string, string> = {
      "Content-Type": contentType,
    };

    if (contentDisposition) {
      responseHeaders["Content-Disposition"] = contentDisposition.replace("attachment", "inline");
    } else {
      responseHeaders["Content-Disposition"] = "inline";
    }

    return new NextResponse(blob, { headers: responseHeaders });
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
