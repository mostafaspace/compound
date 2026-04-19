import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getDocuments, getDocumentTypes } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import { reviewDocumentAction, uploadDocumentAction } from "./actions";

export default async function DocumentsPage() {
  await requireAdminUser(getCurrentUser);
  const [documentTypes, documents] = await Promise.all([getDocumentTypes(), getDocuments()]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <h1 className="text-3xl font-semibold">Verification documents</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Upload sensitive resident files to the private backend storage disk and review their compliance status.
            </p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <form action={uploadDocumentAction} className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold">Upload document</h2>
          <div className="mt-4 grid gap-4">
            <label className="text-sm font-medium">
              Document type
              <select className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="documentTypeId" required>
                {documentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              User ID
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="userId" type="number" min={1} required />
            </label>
            <label className="text-sm font-medium">
              Unit ID
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3 font-mono text-xs" name="unitId" />
            </label>
            <label className="text-sm font-medium">
              File
              <input className="mt-2 block w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required />
            </label>
          </div>
          <button className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" type="submit">
            Upload
          </button>
        </form>

        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-lg font-semibold">Review queue</h2>
          </div>
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Document</th>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {documents.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted" colSpan={4}>
                    No documents submitted yet.
                  </td>
                </tr>
              ) : (
                documents.map((document) => (
                  <tr key={document.id}>
                    <td className="px-4 py-4">
                      <div className="font-semibold">{document.documentType?.name ?? `Type ${document.documentTypeId}`}</div>
                      <div className="text-muted">{document.originalName}</div>
                    </td>
                    <td className="px-4 py-4">User {document.userId}</td>
                    <td className="px-4 py-4 capitalize">{document.status.replace("_", " ")}</td>
                    <td className="px-4 py-4">
                      <form action={reviewDocumentAction.bind(null, document.id)} className="grid gap-2">
                        <select className="h-10 rounded-lg border border-line px-2" name="status" defaultValue={document.status}>
                          <option value="under_review">Under review</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="missing">Missing</option>
                        </select>
                        <input className="h-10 rounded-lg border border-line px-2" name="reviewNote" placeholder="Review note" defaultValue={document.reviewNote ?? ""} />
                        <button className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold hover:border-brand" type="submit">
                          Save review
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
