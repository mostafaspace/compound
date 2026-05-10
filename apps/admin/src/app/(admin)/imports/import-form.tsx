"use client";

import { useRef, useState, useTransition } from "react";

import type { ImportBatch, ImportBatchType } from "@compound/contracts";
import { importBatchTypeValues } from "@compound/contracts";

import { runImportAction } from "./actions";

interface ImportFormProps {
  compounds: Array<{ id: string; name: string }>;
  defaultCompoundId?: string;
  isSuperAdmin: boolean;
  t: {
    startImport: string;
    runImport: string;
    dryRunLabel: string;
    dryRunNote: string;
    compoundLabel: string;
    typeLabel: string;
    fileLabel: string;
    types: Record<string, string>;
    messages: { success: string; dryRunSuccess: string; failed: string };
    result: {
      title: string;
      created: string;
      updated: string;
      skipped: string;
      errors: string;
      totalRows: string;
      dryRun: string;
      yes: string;
      no: string;
    };
    errors: { title: string; row: string; field: string; message: string; none: string };
  };
}

export function ImportForm({ compounds, defaultCompoundId, isSuperAdmin, t }: ImportFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportBatch | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setResult(null);
    setErrorMessage(null);

    startTransition(async () => {
      const res = await runImportAction(formData);
      if (!res.success) {
        setErrorMessage(res.error ?? "Import failed.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <form ref={formRef} onSubmit={handleSubmit} className="rounded-lg border border-line bg-panel p-6 space-y-5">
        {/* Compound selector — shown to super_admin only */}
        {isSuperAdmin && (
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold" htmlFor="compound_id">
              {t.compoundLabel}
            </label>
            <select
              id="compound_id"
              name="compound_id"
              required
              defaultValue={defaultCompoundId ?? ""}
              className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
            >
              <option value="" disabled>— select a compound —</option>
              {compounds.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* For scoped admin the compound_id is injected as a hidden field */}
        {!isSuperAdmin && defaultCompoundId && (
          <input type="hidden" name="compound_id" value={defaultCompoundId} />
        )}

        {/* Import type */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold" htmlFor="type">
            {t.typeLabel}
          </label>
          <select
            id="type"
            name="type"
            required
            className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
          >
            <option value="" disabled>— select a type —</option>
            {importBatchTypeValues.map((v) => (
              <option key={v} value={v}>{t.types[v] ?? v}</option>
            ))}
          </select>
        </div>

        {/* File picker */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold" htmlFor="file">
            {t.fileLabel}
          </label>
          <input
            id="file"
            name="file"
            type="file"
            required
            accept=".csv,text/csv"
            className="block w-full text-sm text-muted file:mr-4 file:rounded-lg file:border file:border-line file:bg-panel file:px-3 file:py-1.5 file:text-sm file:font-semibold hover:file:border-brand"
          />
        </div>

        {/* Dry run toggle */}
        <div className="flex items-start gap-3 rounded-lg border border-line bg-background p-4">
          <input
            id="dry_run"
            name="dry_run"
            type="checkbox"
            defaultChecked
            value="1"
            className="mt-0.5 size-4 shrink-0"
          />
          <div>
            <label className="block text-sm font-semibold cursor-pointer" htmlFor="dry_run">
              {t.dryRunLabel}
            </label>
            <p className="mt-0.5 text-xs text-muted">{t.dryRunNote}</p>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50"
        >
          {isPending ? "…" : t.runImport}
        </button>
      </form>

      {/* Error message */}
      {errorMessage && (
        <div className="rounded-lg border border-danger bg-[#fef2f2] px-4 py-3 text-sm text-danger">
          {errorMessage}
        </div>
      )}

      {/* Dry-run result hint */}
      {result && result.isDryRun && result.errorCount === 0 && (
        <div className="rounded-lg border border-brand bg-[#e6f3ef] px-4 py-3 text-sm text-brand">
          {t.messages.dryRunSuccess}
        </div>
      )}
    </div>
  );
}
