# Frontend Component Patterns

Reference for recurring UI patterns used across the admin web app. Follow these patterns for consistency. All patterns assume Next.js 15 App Router + Tailwind CSS.

---

## Table with Actions

Standard admin listing table. Use `overflow-x-auto` wrapper for mobile responsiveness.

```tsx
<div className="rounded-lg border border-line bg-panel">
  <div className="overflow-x-auto">
    <table className="w-full min-w-[780px] border-collapse text-sm">
      <thead className="bg-background text-muted">
        <tr>
          {columns.map(col => (
            <th key={col.key} className="px-4 py-3 text-start font-semibold">{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.length > 0 ? (
          rows.map(row => (
            <tr className="hover:bg-background/60" key={row.id}>
              <td className="px-4 py-3 font-medium">{row.name}</td>
              <td className="px-4 py-3">
                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  <Link className="text-xs font-semibold text-brand hover:text-brand-strong" href={`/items/${row.id}/edit`}>
                    {t("action.edit")}
                  </Link>
                  <form action={deleteAction.bind(null, row.id)}>
                    <button className="text-xs font-semibold text-danger hover:underline" type="submit">
                      {t("action.delete")}
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td className="px-4 py-6 text-muted" colSpan={columns.length}>
              {t("empty")}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>
```

---

## Status Badges

Three standard variants:

```tsx
// Success / active (green tint + brand text)
const ActiveBadge = ({ label }: { label: string }) => (
  <span className="rounded-lg bg-[#e6f3ef] px-2 py-0.5 text-xs font-semibold text-brand">
    {label}
  </span>
);

// Neutral / inactive (background + muted text)
const InactiveBadge = ({ label }: { label: string }) => (
  <span className="rounded-lg bg-background px-2 py-0.5 text-xs text-muted">
    {label}
  </span>
);

// Role / category (brand tint)
const RoleBadge = ({ label }: { label: string }) => (
  <span className="rounded-lg bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
    {label}
  </span>
);
```

Status-to-variant mapping guide:
| Status | Variant |
|--------|---------|
| `active`, `approved`, `published`, `allowed` | ActiveBadge |
| `inactive`, `archived`, `expired`, `cancelled`, `denied` | InactiveBadge |
| Role names, categories, types | RoleBadge |
| `pending`, `pending_review`, `open` | Custom amber/yellow (define as needed) |

---

## Status Banner (Success Feedback)

Shown after a server action redirects with `?created=1` or `?updated=1`.

```tsx
function StatusBanner({ text }: { text: string }) {
  return (
    <p className="rounded-lg bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">
      {text}
    </p>
  );
}

// Usage in page:
{params.created ? <StatusBanner text={t("messages.created")} /> : null}
{params.deactivated ? <StatusBanner text={t("messages.deactivated")} /> : null}
```

---

## Page Header

Consistent header with breadcrumb and logout.

```tsx
<header className="border-b border-line bg-panel">
  <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
    <div>
      <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/">
        {t("nav.dashboard")}
      </Link>
      <h1 className="mt-2 text-3xl font-semibold">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
    </div>
    <LogoutButton />
  </div>
</header>
```

---

## Form Grid

Standard form layout inside a panel card.

```tsx
<form action={serverAction} className="rounded-lg border border-line bg-panel p-5">
  <h3 className="text-base font-semibold">{t("form.title")}</h3>
  
  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {/* Text input */}
    <label className="text-xs font-semibold text-muted">
      {t("form.name")}
      <input
        className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
        name="name"
        required
        type="text"
      />
    </label>

    {/* Select */}
    <label className="text-xs font-semibold text-muted">
      {t("form.status")}
      <select
        className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
        name="status"
        required
      >
        <option value="">—</option>
        <option value="active">{t("status.active")}</option>
        <option value="inactive">{t("status.inactive")}</option>
      </select>
    </label>

    {/* Date picker */}
    <label className="text-xs font-semibold text-muted">
      {t("form.startDate")}
      <input
        className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
        name="starts_at"
        required
        type="date"
      />
    </label>

    {/* File upload */}
    <label className="text-xs font-semibold text-muted">
      {t("form.file")}
      <input
        accept="application/pdf,image/jpeg,image/png"
        className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
        name="file"
        type="file"
      />
    </label>

    {/* Textarea — spans full row */}
    <label className="col-span-full text-xs font-semibold text-muted">
      {t("form.description")}
      <textarea
        className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
        name="description"
        rows={3}
      />
    </label>
  </div>

  <button
    className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
    type="submit"
  >
    {t("form.submit")}
  </button>
</form>
```

---

## Amount Display

Always format monetary amounts using `Intl.NumberFormat` with the compound's currency and the user's locale.

```ts
function formatAmount(amount: string | number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount));
}
```

---

## Date Display

```ts
function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value: string | null, locale: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
```

---

## Empty State

```tsx
// Inside a table:
<tr>
  <td className="px-4 py-6 text-muted" colSpan={totalColumns}>
    {t("empty")}
  </td>
</tr>

// Standalone empty state (for non-table sections):
<div className="rounded-lg border border-line bg-panel px-6 py-12 text-center">
  <p className="text-sm text-muted">{t("empty")}</p>
</div>
```

---

## Confirmation for Destructive Actions

For irreversible actions (delete, archive, deactivate), always use a form with a submit button — never an `<a>` tag or `onClick` without confirmation. The server action handles idempotency.

If the action is truly irreversible (e.g. archive), consider adding a visible warning text next to the button:

```tsx
<form action={archiveAction.bind(null, item.id)} className="flex items-center gap-2">
  <button className="text-xs font-semibold text-danger hover:underline" type="submit">
    {t("action.archive")}
  </button>
  <span className="text-xs text-muted">{t("action.archiveWarning")}</span>
</form>
```

---

## Loading State

Since admin pages are server components, loading is handled by the Next.js loading boundary:

```
app/audit-logs/
  loading.tsx     ← skeleton while page.tsx awaits
  page.tsx
```

```tsx
// loading.tsx
export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        <div className="h-8 w-48 animate-pulse rounded bg-panel" />
        <div className="mt-4 h-64 animate-pulse rounded-lg bg-panel" />
      </div>
    </div>
  );
}
```

---

## Pagination

For paginated lists, pass `page` query param. Example:

```tsx
// In page.tsx
const page = Number(searchParams?.page ?? 1);
const result = await getAuditLogs({ page, per_page: 20 });

// Pagination controls:
<div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-muted">
  <span>{t("pagination.showing", { from: result.meta.from, to: result.meta.to, total: result.meta.total })}</span>
  <div className="flex gap-2">
    {result.meta.current_page > 1 && (
      <Link className="font-semibold text-brand hover:text-brand-strong" href={`?page=${result.meta.current_page - 1}`}>
        {t("pagination.prev")}
      </Link>
    )}
    {result.meta.current_page < result.meta.last_page && (
      <Link className="font-semibold text-brand hover:text-brand-strong" href={`?page=${result.meta.current_page + 1}`}>
        {t("pagination.next")}
      </Link>
    )}
  </div>
</div>
```
