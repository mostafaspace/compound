import { loginAction } from "./actions";

interface LoginPageProps {
  searchParams?: Promise<{
    accepted?: string;
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};
  const hasError = params.error === "invalid";
  const acceptedInvite = params.accepted === "1";

  return (
    <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex min-h-[38vh] flex-col justify-between bg-brand px-6 py-8 text-white lg:min-h-screen lg:px-10">
        <div className="text-sm font-semibold uppercase">Compound admin</div>
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">Operations console</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#d8eee8]">
            Secure access for property registry, finance, residents, governance, support, and security operations.
          </p>
        </div>
        <p className="text-sm text-[#d8eee8]">Use a seeded admin account after running backend migrations and seeders.</p>
      </section>

      <section className="flex items-center justify-center px-5 py-8">
        <form action={loginAction} className="w-full max-w-md rounded-lg border border-line bg-panel p-6">
          <div>
            <h2 className="text-2xl font-semibold">Sign in</h2>
            <p className="mt-2 text-sm text-muted">Access is limited to active admin, board, finance, and support users.</p>
          </div>

          {hasError ? (
            <div className="mt-5 rounded-lg border border-[#f2b8b5] bg-[#fff3f2] px-4 py-3 text-sm font-medium text-danger">
              Credentials are invalid, the account is inactive, or the API is unavailable.
            </div>
          ) : null}
          {acceptedInvite ? (
            <div className="mt-5 rounded-lg border border-[#b7d9cc] bg-[#e6f3ef] px-4 py-3 text-sm font-medium text-brand">
              Account completed. Sign in with the password you just created.
            </div>
          ) : null}

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold">Email</span>
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
              <span className="text-sm font-semibold">Password</span>
              <input
                autoComplete="current-password"
                className="h-11 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                name="password"
                placeholder="password"
                required
                type="password"
              />
            </label>
          </div>

          <button
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
            type="submit"
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
