import { loginAction } from "./actions";
import { LanguageToggle } from "@/components/language-toggle";
import { getTranslations } from "next-intl/server";

interface LoginPageProps {
  searchParams?: Promise<{
    accepted?: string;
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const t = await getTranslations("Login");
  const params = searchParams ? await searchParams : {};
  const hasError = params.error === "invalid";
  const acceptedInvite = params.accepted === "1";

  return (
    <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex min-h-[38vh] flex-col justify-between bg-brand px-6 py-8 text-white lg:min-h-screen lg:px-10">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm font-semibold uppercase">{t("brand")}</div>
          <div className="text-foreground">
            <LanguageToggle />
          </div>
        </div>
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">{t("heroTitle")}</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#d8eee8]">
            {t("heroSubtitle")}
          </p>
        </div>
        <p className="text-sm text-[#d8eee8]">{t("seedHint")}</p>
      </section>

      <section className="flex items-center justify-center px-5 py-8">
        <form action={loginAction} className="w-full max-w-md rounded-lg border border-line bg-panel p-6">
          <div>
            <h2 className="text-2xl font-semibold">{t("title")}</h2>
            <p className="mt-2 text-sm text-muted">{t("subtitle")}</p>
          </div>

          {hasError ? (
            <div className="mt-5 rounded-lg border border-[#f2b8b5] bg-[#fff3f2] px-4 py-3 text-sm font-medium text-danger">
              {t("errors.invalid")}
            </div>
          ) : null}
          {acceptedInvite ? (
            <div className="mt-5 rounded-lg border border-[#b7d9cc] bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">
              {t("messages.acceptedInvite")}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold">{t("fields.email")}</span>
              <input
                autoComplete="email"
                className="h-11 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                name="email"
                placeholder="admin@compound.local"
                required
                type="email"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">{t("fields.password")}</span>
              <input
                autoComplete="current-password"
                className="h-11 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                name="password"
                placeholder={t("fields.passwordPlaceholder")}
                required
                type="password"
              />
            </label>
          </div>

          <button
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
            type="submit"
          >
            {t("submit")}
          </button>
        </form>
      </section>
    </main>
  );
}
