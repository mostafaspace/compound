import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getSystemStatus } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";

const workstreams = [
  { label: "Finance review", value: "12", detail: "payments awaiting allocation", tone: "text-brand" },
  { label: "Visitor gate", value: "38", detail: "active passes today", tone: "text-accent" },
  { label: "Resident issues", value: "7", detail: "breached response targets", tone: "text-danger" },
  { label: "Governance", value: "3", detail: "open approvals", tone: "text-brand-strong" },
];

const priorityQueue = [
  "Verify new owner onboarding requests",
  "Review unallocated bank transfer receipts",
  "Approve urgent maintenance vendor estimate",
  "Publish board meeting action items",
];

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.32a1 1 0 0 1-1.421.002L3.29 9.227a1 1 0 1 1 1.42-1.408l4.04 4.08 6.54-6.603a1 1 0 0 1 1.414-.006Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default async function Home() {
  const user = await requireAdminUser(getCurrentUser);
  const status = await getSystemStatus();
  const apiOnline = status?.status === "ok";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase text-brand">Compound operations</p>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Production control center</h1>
            <p className="mt-2 text-sm text-muted">
              Signed in as {user.name} / {user.role.replaceAll("_", " ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-strong"
              href="#priority-queue"
            >
              <CheckIcon />
              Review queue
            </a>
            <a
              className="inline-flex h-11 items-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold text-foreground transition hover:border-brand"
              href="#system-status"
            >
              System status
            </a>
            <Link
              className="inline-flex h-11 items-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold text-foreground transition hover:border-brand"
              href="/compounds"
            >
              Property registry
            </Link>
            <Link
              className="inline-flex h-11 items-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold text-foreground transition hover:border-brand"
              href="/documents"
            >
              Documents
            </Link>
            <Link
              className="inline-flex h-11 items-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold text-foreground transition hover:border-brand"
              href="/visitors"
            >
              Visitors
            </Link>
            <Link
              className="inline-flex h-11 items-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold text-foreground transition hover:border-brand"
              href="/onboarding"
            >
              Onboarding
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {workstreams.map((item) => (
          <article className="rounded-lg border border-line bg-panel p-5" key={item.label}>
            <p className="text-sm font-medium text-muted">{item.label}</p>
            <p className={`mt-4 text-4xl font-semibold ${item.tone}`}>{item.value}</p>
            <p className="mt-2 text-sm text-muted">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-8 md:grid-cols-[1.4fr_0.9fr] lg:px-8">
        <div id="priority-queue" className="rounded-lg border border-line bg-panel p-5">
          <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
            <div>
              <h2 className="text-xl font-semibold">Priority queue</h2>
              <p className="mt-1 text-sm text-muted">Sorted by SLA, financial risk, and resident impact.</p>
            </div>
            <span className="rounded-lg bg-[#e6f3ef] px-3 py-1 text-sm font-semibold text-brand">Live</span>
          </div>
          <ol className="mt-4 divide-y divide-line">
            {priorityQueue.map((item, index) => (
              <li className="flex items-center gap-4 py-4" key={item}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-sm font-semibold">
                  {index + 1}
                </span>
                <span className="text-base font-medium">{item}</span>
              </li>
            ))}
          </ol>
        </div>

        <aside id="system-status" className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-xl font-semibold">System status</h2>
          <div className="mt-5 space-y-4 text-sm">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="text-muted">API</span>
              <span className={apiOnline ? "font-semibold text-brand" : "font-semibold text-danger"}>
                {apiOnline ? "Online" : "Offline"}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="text-muted">Environment</span>
              <span className="font-semibold">{status?.environment ?? "not connected"}</span>
            </div>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="text-muted">Timezone</span>
              <span className="font-semibold">{status?.timezone ?? "pending"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Realtime</span>
              <span className="font-semibold text-accent">Reverb first</span>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
