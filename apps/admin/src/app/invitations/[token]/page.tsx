import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { getResidentInvitation } from "@/lib/api";

import { acceptResidentInvitationAction } from "../actions";

interface InvitationAcceptPageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitationAcceptPage({ params }: InvitationAcceptPageProps) {
  const { token } = await params;
  const [invitation, t, locale] = await Promise.all([
    getResidentInvitation(token),
    getTranslations("InviteAcceptance"),
    getLocale(),
  ]);

  if (!invitation) {
    notFound();
  }

  const unitLabel = invitation.unit?.unitNumber ? t("unitLinked", { unit: invitation.unit.unitNumber }) : t("unitNotLinked");
  const expiresLabel = invitation.expiresAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(invitation.expiresAt))
    : t("notSet");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-5 py-8">
        <div>
          <p className="text-sm font-semibold uppercase text-brand">{t("eyebrow")}</p>
          <h1 className="mt-2 text-3xl font-semibold">{t("title")}</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            {t("subtitle", { email: invitation.email })}
          </p>
          <dl className="mt-5 grid gap-3 rounded-lg border border-line bg-panel p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-muted">{t("fields.unit")}</dt>
              <dd className="mt-1 text-foreground">{unitLabel}</dd>
            </div>
            <div>
              <dt className="font-semibold text-muted">{t("fields.expires")}</dt>
              <dd className="mt-1 text-foreground">{expiresLabel}</dd>
            </div>
          </dl>
        </div>
        <form action={acceptResidentInvitationAction.bind(null, token)} className="mt-6 rounded-lg border border-line bg-panel p-5">
          <div className="grid gap-4">
            <label className="text-sm font-medium">
              {t("fields.name")}
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="name" required defaultValue={invitation.user?.name ?? ""} />
            </label>
            <label className="text-sm font-medium">
              {t("fields.phone")}
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="phone" defaultValue={invitation.user?.phone ?? ""} />
            </label>
            <label className="text-sm font-medium">
              {t("fields.password")}
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="password" type="password" required minLength={10} />
            </label>
            <label className="text-sm font-medium">
              {t("fields.confirmPassword")}
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="password_confirmation" type="password" required minLength={10} />
            </label>
          </div>
          <button className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" type="submit">
            {t("submit")}
          </button>
          <p className="mt-4 text-xs leading-5 text-muted">{t("privacyNote")}</p>
        </form>
      </section>
    </main>
  );
}
