import Link from "next/link";

export const metadata = { title: "Access Denied — Compound Admin" };

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-danger/10">
        <svg
          aria-hidden="true"
          className="h-10 w-10 text-danger"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      <h1 className="mb-2 text-3xl font-bold">Access Denied</h1>
      <p className="mb-8 max-w-md text-muted">
        You don&apos;t have permission to access this section. Contact your administrator if
        you believe this is a mistake.
      </p>

      <Link
        href="/"
        className="inline-flex h-10 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        ← Back to Dashboard
      </Link>
    </div>
  );
}
