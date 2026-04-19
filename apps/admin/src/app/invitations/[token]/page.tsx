import { notFound } from "next/navigation";

import { getResidentInvitation } from "@/lib/api";

import { acceptResidentInvitationAction } from "../actions";

interface InvitationAcceptPageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitationAcceptPage({ params }: InvitationAcceptPageProps) {
  const { token } = await params;
  const invitation = await getResidentInvitation(token);

  if (!invitation) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-5 py-8">
        <div>
          <h1 className="text-3xl font-semibold">Complete your compound account</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            This private invite is for {invitation.email}. Set your password and confirm your contact details before signing in.
          </p>
        </div>
        <form action={acceptResidentInvitationAction.bind(null, token)} className="mt-6 rounded-lg border border-line bg-panel p-5">
          <div className="grid gap-4">
            <label className="text-sm font-medium">
              Name
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="name" required defaultValue={invitation.user?.name ?? ""} />
            </label>
            <label className="text-sm font-medium">
              Phone
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="phone" defaultValue={invitation.user?.phone ?? ""} />
            </label>
            <label className="text-sm font-medium">
              Password
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="password" type="password" required minLength={10} />
            </label>
            <label className="text-sm font-medium">
              Confirm password
              <input className="mt-2 h-11 w-full rounded-lg border border-line px-3" name="password_confirmation" type="password" required minLength={10} />
            </label>
          </div>
          <button className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" type="submit">
            Complete account
          </button>
        </form>
      </section>
    </main>
  );
}
