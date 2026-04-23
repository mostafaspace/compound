import { getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getDocuments, getDocumentTypes, getSystemStatus } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import { reviewDocumentAction, uploadDocumentAction } from "./actions";

interface DocumentsPageProps {
  searchParams?: Promise<{
    error?: string;
    reviewed?: string;
    uploaded?: string;
  }>;
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const t = await getTranslations("Documents");
  await requireAdminUser(getCurrentUser);
  const params = searchParams ? await searchParams : {};
  const [documentTypes, documents, systemStatus] = await Promise.all([
    getDocumentTypes(),
    getDocuments(),
    getSystemStatus(),
  ]);
  const isDegraded = systemStatus?.status !== "ok";
  const uploadDisabled = documentTypes.length === 0;
  const showLoadWarning = isDegraded && documentTypes.length === 0 && documents.length === 0;

  const messageTone =
    params.error === "upload_failed" || params.error === "review_failed"
      ? "danger"
      : params.uploaded || params.reviewed
        ? "success"
        : null;
  const messageText =
    params.error === "upload_failed"
      ? t("messages.uploadFailed")
      : params.error === "review_failed"
        ? t("messages.reviewFailed")
        : params.uploaded
          ? t("messages.uploaded")
          : params.reviewed
            ? t("messages.reviewed")
            : null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <h1 className="text-3xl font-semibold">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        {messageText ? (
          <div
            className={`rounded-lg px-4 py-3 text-sm font-medium lg:col-span-2 ${
              messageTone === "danger" ? "bg-[#fff3f2] text-danger" : "bg-[#e6f3ef] text-brand"
            }`}
          >
            {messageText}
          </div>
        ) : null}

        {showLoadWarning ? (
          <div className="rounded-lg border border-[#e7d7a9] bg-[#fff8e8] px-4 py-3 text-sm text-[#7a5d1a] lg:col-span-2">
            <p className="font-semibold">{t("degraded.title")}</p>
            <p className="mt-1">{t("degraded.description")}</p>
          </div>
        ) : null}

        <form action={uploadDocumentAction} className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold">{t("upload.title")}</h2>
          {uploadDisabled ? <p className="mt-2 text-sm text-muted">{t("upload.disabled")}</p> : null}
          <div className="mt-4 grid gap-4">
            <label className="text-sm font-medium">
              {t("fields.documentType")}
              <select className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="documentTypeId" disabled={uploadDisabled} required>
                {documentTypes.length === 0 ? (
                  <option value="">{t("upload.noDocumentTypes")}</option>
                ) : (
                  documentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="text-sm font-medium">
              {t("fields.userId")}
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" disabled={uploadDisabled} name="userId" type="number" min={1} required />
            </label>
            <label className="text-sm font-medium">
              {t("fields.unitId")}
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3 font-mono text-xs" disabled={uploadDisabled} name="unitId" />
            </label>
            <label className="text-sm font-medium">
              {t("fields.file")}
              <input
                className="mt-2 block w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
                disabled={uploadDisabled}
                name="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                required
              />
            </label>
          </div>
          <button
            className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
            disabled={uploadDisabled}
            type="submit"
          >
            {t("upload.submit")}
          </button>
        </form>

        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-lg font-semibold">{t("reviewQueue.title")}</h2>
          </div>
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("table.document")}</th>
                <th className="px-4 py-3 font-semibold">{t("table.user")}</th>
                <th className="px-4 py-3 font-semibold">{t("table.status")}</th>
                <th className="px-4 py-3 font-semibold">{t("table.review")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {documents.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted" colSpan={4}>
                    {t("reviewQueue.empty")}
                  </td>
                </tr>
              ) : (
                documents.map((document) => (
                  <tr key={document.id}>
                    <td className="px-4 py-4">
                      <div className="font-semibold">{document.documentType?.name ?? t("table.unknownType", { id: document.documentTypeId })}</div>
                      <div className="text-muted">{document.originalName}</div>
                    </td>
                    <td className="px-4 py-4">{t("table.userRow", { id: document.userId })}</td>
                    <td className="px-4 py-4">{t(`statuses.${document.status}`)}</td>
                    <td className="px-4 py-4">
                      <form action={reviewDocumentAction.bind(null, document.id)} className="grid gap-2">
                        <select className="h-10 rounded-lg border border-line px-2" name="status" defaultValue={document.status}>
                          <option value="under_review">{t("statuses.under_review")}</option>
                          <option value="approved">{t("statuses.approved")}</option>
                          <option value="rejected">{t("statuses.rejected")}</option>
                          <option value="missing">{t("statuses.missing")}</option>
                        </select>
                        <input className="h-10 rounded-lg border border-line px-2" name="reviewNote" placeholder={t("fields.reviewNote")} defaultValue={document.reviewNote ?? ""} />
                        <button className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold hover:border-brand" type="submit">
                          {t("actions.saveReview")}
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
