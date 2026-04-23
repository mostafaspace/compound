# Frontend AI Coding Handoff Guide

This guide is for AI and human developers building screens in the **admin web** (`apps/admin`) and **mobile** (`apps/mobile`) apps.

---

## CRITICAL: Read AGENTS.md First

Every app directory contains an `AGENTS.md`. Read it before writing any code. For the admin app:

```
apps/admin/AGENTS.md  →  references AGENTS.md at repo root
```

The admin app uses **Next.js 15 with breaking API changes**. Consult `node_modules/next/dist/docs/` for current API signatures. Do not assume Next.js 13/14 patterns apply.

---

## Admin Web (`apps/admin`)

### Tech Stack
- **Next.js 15** App Router (server components by default)
- **next-intl** for i18n (EN + AR, RTL for Arabic)
- **Tailwind CSS** with design tokens (`bg-panel`, `text-muted`, `border-line`, `text-brand`, etc.)
- **Server Actions** for mutations (no API client layer for simple mutations)
- TypeScript strict mode

### Route Structure

```
src/app/
  layout.tsx                  — root layout (sets dir="rtl" for AR)
  page.tsx                    — dashboard
  auth/
    login/page.tsx            — public login page
  audit-logs/page.tsx
  announcements/
    page.tsx                  — list + create
    [id]/edit/page.tsx
  documents/page.tsx
  compounds/
    page.tsx
    [id]/
      buildings/
        [buildingId]/units/page.tsx
  representative-assignments/
    page.tsx
    [id]/edit/page.tsx
  visitors/page.tsx
  finance/
    unit-accounts/page.tsx
    payment-submissions/page.tsx
  issues/page.tsx
```

### Data Fetching Pattern

All data fetching happens in **server components** using functions from `@/lib/api`.

```tsx
// page.tsx (server component)
import { getCompounds } from "@/lib/api";

export default async function Page() {
  const compounds = await getCompounds(); // server-side fetch with auth cookie
  return <CompoundTable compounds={compounds} />;
}
```

### API Client (`@/lib/api`)

```ts
// lib/api.ts — all functions are async, throw on error
export async function getCompounds(): Promise<CompoundSummary[]>
export async function getCompound(id: string): Promise<CompoundDetail>
export async function getCurrentUser(): Promise<AuthenticatedUser>
export async function getAuditLogs(filters?: AuditLogFilters): Promise<PaginatedEnvelope<AuditLogEntry>>
// ... one function per API endpoint
```

- Functions are called server-side only (in page.tsx and server components).
- Auth is passed via session cookies (NextAuth or custom cookie-based session).
- On 401: redirect to `/auth/login`.
- On 403: show error page or redirect to `/`.

### Session & Auth (`@/lib/session`)

```ts
// lib/session.ts
export async function getCurrentUser(): Promise<AuthenticatedUser | null>
export async function requireAdminUser(getCurrentUserFn): Promise<AuthenticatedUser>
```

`requireAdminUser` throws/redirects if user is not authenticated or is a resident. Call at the top of every admin page.

### Mutations (Server Actions)

Server actions live in `actions.ts` files co-located with their page.

```ts
// app/representative-assignments/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createRepresentativeAssignmentAction(formData: FormData) {
  const data = {
    user_id: formData.get("user_id"),
    // ...
  };
  await createRepresentativeAssignment(compoundId, data);
  revalidatePath("/representative-assignments");
  redirect("/representative-assignments?created=1");
}
```

Rules:
- Always `revalidatePath` after mutations so the server component re-fetches.
- Use `redirect()` with `?created=1` or `?deactivated=1` query params to show status banners.
- Do not use `useState` or client-side fetch for admin CRUD forms — use server actions with `<form action={...}>`.

### Localization (i18n)

**All user-facing text must be translated into EN and AR.** No hardcoded English strings.

```tsx
// In server components:
import { getTranslations, getLocale } from "next-intl/server";

const t = await getTranslations("PageNamespace");
const locale = await getLocale();
```

```tsx
// Usage:
<h1>{t("title")}</h1>
<p>{t("subtitle")}</p>
<th>{t("table.name")}</th>
```

Translation files:
- `apps/admin/messages/en.json` — English
- `apps/admin/messages/ar.json` — Arabic

When adding a new page or component, add keys to **both** files.

#### Namespace Conventions
Each page gets its own namespace named after the page (PascalCase):
```json
{
  "Dashboard": { "title": "Dashboard" },
  "AuditLogs": { "title": "Audit Logs", "table": { "action": "Action" } },
  "OrgChart": { "title": "Organization Chart" }
}
```

#### RTL Support
The root layout sets `dir="rtl"` for Arabic. Use logical CSS properties where possible:
- Use `text-start` instead of `text-left`
- Use `ms-*` / `me-*` instead of `ml-*` / `mr-*`
- Test with `?locale=ar` or language switcher

### Design System

Use these Tailwind design tokens (defined in `tailwind.config.ts`):

| Token | Usage |
|-------|-------|
| `bg-background` | Page background |
| `bg-panel` | Cards, headers, table background |
| `border-line` | All borders |
| `text-foreground` | Primary text |
| `text-muted` | Secondary/helper text |
| `text-brand` | Brand color (links, badges) |
| `text-brand-strong` | Hover state for brand color |
| `text-danger` | Error / destructive actions |

### Common Component Patterns

#### Table Page
```tsx
<main className="min-h-screen bg-background text-foreground">
  <header className="border-b border-line bg-panel">
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
      <div>
        <Link className="text-sm font-semibold text-brand" href="/">{t("nav.dashboard")}</Link>
        <h1 className="mt-2 text-3xl font-semibold">{t("title")}</h1>
      </div>
      <LogoutButton />
    </div>
  </header>
  <section className="mx-auto max-w-7xl space-y-8 px-5 py-6 lg:px-8">
    <div className="rounded-lg border border-line bg-panel">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] border-collapse text-sm">
          <thead className="bg-background text-muted">
            <tr>
              <th className="px-4 py-3 text-start font-semibold">{t("table.name")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(row => (
              <tr className="hover:bg-background/60" key={row.id}>
                <td className="px-4 py-3">{row.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </section>
</main>
```

#### Status Badge
```tsx
// Active (green tint)
<span className="rounded-lg bg-[#e6f3ef] px-2 py-0.5 text-xs font-semibold text-brand">
  {t("status.active")}
</span>

// Inactive (muted)
<span className="rounded-lg bg-background px-2 py-0.5 text-xs text-muted">
  {t("status.inactive")}
</span>

// Role/category badge (brand tint)
<span className="rounded-lg bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
  {roleLabel}
</span>
```

#### Create Form
```tsx
<form action={createAction} className="rounded-lg border border-line bg-panel p-5">
  <h3 className="text-base font-semibold">{t("newItem")}</h3>
  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <label className="text-xs font-semibold text-muted">
      {t("form.name")}
      <input
        className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
        name="name"
        required
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

#### Date Formatting
Always use `Intl.DateTimeFormat(locale, ...)` with the locale from `getLocale()`:
```ts
function formatDate(value: string | null, locale: string): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
}
```

---

## Mobile App (`apps/mobile`)

### Tech Stack
- React Native CLI
- Native Android and iOS projects under `apps/mobile/android` and `apps/mobile/ios`
- Shared contracts from `packages/contracts`

### API Client Pattern

```ts
// lib/api.ts
const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<ApiEnvelope<T>> {
  const token = await getStoredToken();
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new ApiError(res.status, await res.json());
  return res.json();
}
```

### Auth Storage
- Store Sanctum token in a secure native-backed store such as `react-native-keychain`.
- On app launch: check stored token with `GET /auth/me`. If 401, clear token and show login.

### Error Handling
```ts
try {
  const { data } = await apiFetch<LoginResult>('/auth/login', { method: 'POST', body: JSON.stringify(input) });
  await storeToken(data.token);
} catch (err) {
  if (err instanceof ApiError && err.status === 422) {
    setErrors(err.body.errors);
  }
}
```

### Localization
- Use `i18n-js` or `react-native-localize` for EN/AR strings.
- RTL: `I18nManager.isRTL` should return `true` for Arabic. Set `I18nManager.allowRTL(true)` in app entry.
- Restart the app after RTL toggle (required by React Native).

---

## Shared Contracts (`packages/contracts`)

Import types from `@compound/contracts`:
```ts
import type { AuthenticatedUser, CompoundSummary, IssueSummary } from "@compound/contracts";
```

When a new backend type is added, add its TypeScript interface to the appropriate contracts file and re-export from `src/index.ts`.

---

## Capability Checks

```ts
// Helper used in admin pages
function canManageFinance(user: AuthenticatedUser): boolean {
  return ["super_admin", "compound_admin", "board_member", "finance_reviewer"].includes(user.role);
}

function isAdmin(user: AuthenticatedUser): boolean {
  return ["super_admin", "compound_admin"].includes(user.role);
}
```

Conditional UI rendering based on role:
```tsx
{isAdmin(user) && <Link href="/audit-logs">{t("nav.auditLogs")}</Link>}
```

---

## Accessibility

- All interactive elements must have accessible labels (`aria-label` or visible text).
- Form inputs must have associated `<label>` elements.
- Use `<button type="button">` for non-submit buttons to prevent accidental form submission.
- Color-only status indicators must also use text labels.

---

## File Upload Rules

- Always validate MIME type and file size **client-side** before submitting (prevents wasted round trips).
- Use `multipart/form-data` encoding (default for HTML forms with file inputs).
- Never display the raw S3 URL — always use signed URL from the download endpoint.
- Show upload progress for files > 1 MB.
- Max sizes: documents and issue attachments — 10 MB; announcement attachments — 20 MB.
