import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getUsers } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";
import { UsersTableClient } from "./users-table-client";

interface SupportUsersPageProps {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    role?: string;
  }>;
}

const statusOptions = ["", "active", "suspended", "archived", "invited", "pending_review"];
const roleOptions = [
  "",
  "super_admin",
  "compound_admin",
  "board_member",
  "finance_reviewer",
  "security_guard",
  "resident_owner",
  "resident_tenant",
  "support_agent",
];


export default async function SupportUsersPage({ searchParams }: SupportUsersPageProps) {
  await requireAdminUser(getCurrentUser, ["super_admin", "compound_admin", "support_agent"]);
  const params = searchParams ? await searchParams : {};

  const users = await getUsers({
    q: params.q?.trim() || undefined,
    status: params.status || undefined,
    role: params.role || undefined,
    perPage: 50,
  });

  const t = await getTranslations("SupportConsole");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/">
              {t("back")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
              href="/support/merges"
            >
              {t("mergesLink")}
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        <form className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-panel p-4">
          <label className="min-w-[200px] flex-1 text-sm font-semibold">
            {t("search")}
            <input
              className="mt-2 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
              defaultValue={params.q ?? ""}
              name="q"
              placeholder={t("searchPlaceholder")}
            />
          </label>
          <label className="text-sm font-semibold">
            {t("statusFilter")}
            <select
              className="mt-2 h-11 rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
              defaultValue={params.status ?? ""}
              name="status"
            >
              {statusOptions.map((s) => (
                <option key={s || "all"} value={s}>
                  {s ? t(`status${s.split("_").map((p) => p[0].toUpperCase() + p.slice(1)).join("")}` as Parameters<typeof t>[0]) : t("all")}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            {t("roleFilter")}
            <select
              className="mt-2 h-11 rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-brand"
              defaultValue={params.role ?? ""}
              name="role"
            >
              {roleOptions.map((r) => (
                <option key={r || "all"} value={r}>
                  {r || t("all")}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
              type="submit"
            >
              {t("filter")}
            </button>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold hover:border-brand"
              href="/support/users"
            >
              {t("clearFilters")}
            </Link>
          </div>
        </form>

        <div className="mt-5 overflow-hidden rounded-lg border border-line bg-panel">
          <div className="flex items-center justify-between border-b border-line p-4">
            <p className="text-sm text-muted">{users.length} user(s) found</p>
          </div>

          <UsersTableClient
            users={users}
            colName={t("colName")}
            colEmail={t("colEmail")}
            colRole={t("colRole")}
            colStatus={t("colStatus")}
            colActions={t("colActions")}
            empty={t("empty")}
            viewDetails={t("viewDetails")}
          />
        </div>
      </section>
    </main>
  );
}
