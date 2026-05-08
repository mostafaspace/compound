import Link from "next/link";

import { SiteNav } from "@/components/site-nav";
import { config } from "@/lib/config";
import { getCurrentUser, listDocumentReviews, type ApartmentDocumentReview } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import { reviewDocumentVersionAction } from "./actions";

interface DocumentReviewsPageProps {
  searchParams?: Promise<{
    approved?: string;
    rejected?: string;
  }>;
}

export default async function DocumentReviewsPage({ searchParams }: DocumentReviewsPageProps) {
  await requireAdminUser(getCurrentUser);
  const params = searchParams ? await searchParams : {};
  const reviews = await listDocumentReviews();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[{ label: "Document reviews" }]} />

      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/">
              Back to dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Document reviews</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted">
              Review replacement uploads. The current document remains active until approval.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-background px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Pending</div>
            <div className="mt-1 text-2xl font-semibold">{reviews.length}</div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-5 px-5 py-6 lg:px-8">
        {params.approved ? <StatusBanner text="Document replacement approved." /> : null}
        {params.rejected ? <StatusBanner text="Document replacement rejected." /> : null}

        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead className="bg-background text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">Unit / type</th>
                  <th className="px-4 py-3 text-start font-semibold">Current file</th>
                  <th className="px-4 py-3 text-start font-semibold">Pending file</th>
                  <th className="px-4 py-3 text-start font-semibold">Uploader</th>
                  <th className="px-4 py-3 text-start font-semibold">Submitted</th>
                  <th className="px-4 py-3 text-start font-semibold">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {reviews.length > 0 ? (
                  reviews.map((review) => <ReviewRow key={review.id} review={review} />)
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-muted" colSpan={6}>
                      No document replacements are waiting for review.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

function ReviewRow({ review }: { review: ApartmentDocumentReview }) {
  const document = review.document;

  return (
    <tr className="align-top hover:bg-background/60">
      <td className="px-4 py-4">
        <div className="font-semibold">Unit {document?.unitId ?? "Unknown"}</div>
        <div className="mt-1 text-xs capitalize text-muted">{document?.documentType?.replace(/_/g, " ") ?? "Document"}</div>
        <div className="mt-1 text-xs text-muted">Current v{document?.version ?? "-"}</div>
      </td>
      <td className="px-4 py-4">
        {document?.filePath ? <FileLink filePath={document.filePath} label="Open current" /> : <span className="text-muted">-</span>}
      </td>
      <td className="px-4 py-4">
        <FileLink filePath={review.filePath} label="Open pending" />
        <div className="mt-1 text-xs text-muted">{review.mimeType ?? "Unknown type"}</div>
      </td>
      <td className="px-4 py-4">
        <div className="font-medium">{review.uploader?.name ?? `User #${review.uploadedBy}`}</div>
        <div className="mt-1 text-xs text-muted">ID {review.uploadedBy}</div>
      </td>
      <td className="px-4 py-4 text-muted">{formatDate(review.createdAt)}</td>
      <td className="px-4 py-4">
        <div className="grid min-w-64 gap-3">
          <form action={reviewDocumentVersionAction.bind(null, review.id, "approved")} className="grid gap-2">
            <textarea className="min-h-20 rounded-lg border border-line bg-background px-3 py-2 text-xs" name="notes" placeholder="Approval notes (optional)" />
            <button className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-strong" type="submit">
              Approve
            </button>
          </form>
          <form action={reviewDocumentVersionAction.bind(null, review.id, "rejected")} className="grid gap-2">
            <textarea className="min-h-20 rounded-lg border border-line bg-background px-3 py-2 text-xs" name="notes" placeholder="Rejection notes (optional)" />
            <button className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-3 text-xs font-semibold text-danger hover:border-danger" type="submit">
              Reject
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}

function FileLink({ filePath, label }: { filePath: string; label: string }) {
  return (
    <a className="font-semibold text-brand hover:text-brand-strong" href={storageUrl(filePath)} rel="noreferrer" target="_blank">
      {label}
    </a>
  );
}

function StatusBanner({ text }: { text: string }) {
  return <div className="rounded-lg border border-[#cfe5dc] bg-[#eef8f4] px-4 py-3 text-sm font-medium text-brand">{text}</div>;
}

function storageUrl(filePath: string): string {
  return `${new URL(config.apiBaseUrl).origin}/storage/${filePath}`;
}

function formatDate(value: string | null): string {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
