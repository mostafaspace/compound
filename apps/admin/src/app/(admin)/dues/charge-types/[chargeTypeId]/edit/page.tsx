import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getChargeType } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

import { updateChargeTypeAction } from "@/app/(admin)/dues/actions";

interface EditChargeTypePageProps {
  params: Promise<{ chargeTypeId: string }>;
}

export default async function EditChargeTypePage({ params }: EditChargeTypePageProps) {
  await requireAdminUser(getCurrentUser);
  const t = await getTranslations("Dues");
  const { chargeTypeId } = await params;
  const chargeType = await getChargeType(chargeTypeId);

  if (!chargeType) {
    notFound();
  }

  const updateAction = updateChargeTypeAction.bind(null, chargeTypeId);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link className="text-sm font-semibold text-brand hover:text-brand-strong" href="/dues">
              {t("backToDues")}
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">{t("chargeTypes")}</h1>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-5 py-6 lg:px-8">
        <form action={updateAction} className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-lg font-semibold">{chargeType.name}</h2>
          <p className="mt-1 font-mono text-xs text-muted">{chargeType.id}</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-muted">
              {t("name")}
              <input
                className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                defaultValue={chargeType.name}
                name="name"
                required
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              {t("code")}
              <input
                className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 font-mono text-sm"
                defaultValue={chargeType.code}
                name="code"
                required
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              {t("defaultAmount")}
              <input
                className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
                defaultValue={chargeType.defaultAmount ?? ""}
                name="default_amount"
                step="0.01"
                type="number"
              />
            </label>
            <label className="flex items-center gap-2 pt-5 text-xs font-semibold text-muted">
              <input
                className="h-4 w-4 rounded border border-line"
                defaultChecked={chargeType.isRecurring}
                name="is_recurring"
                type="checkbox"
              />
              {t("isRecurring")}
            </label>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
              type="submit"
            >
              Save changes
            </button>
            <Link
              className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm font-semibold text-muted hover:border-brand hover:text-foreground"
              href="/dues"
            >
              {t("backToDues")}
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
