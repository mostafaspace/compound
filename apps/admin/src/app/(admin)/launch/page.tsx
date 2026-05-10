import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser, getLaunchReadiness } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";
import type { LaunchCheck } from "@/lib/api";

// ─── Status indicator ─────────────────────────────────────────────────────────

function CheckBadge({ status }: { status: string }) {
  if (status === "pass" || status === "ok" || status === "configured") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f3ef] px-2 py-0.5 text-xs font-semibold text-brand">
        ✓ {status}
      </span>
    );
  }
  if (status === "warn" || status === "not_configured") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#fff8e8] px-2 py-0.5 text-xs font-semibold text-[#7a5d1a]">
        ⚠ {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#fff3f2] px-2 py-0.5 text-xs font-semibold text-danger">
      ✗ {status}
    </span>
  );
}

// ─── Check row ────────────────────────────────────────────────────────────────

function CheckRow({ name, check }: { name: string; check: LaunchCheck }) {
  const details = Object.entries(check)
    .filter(([k]) => k !== "status" && k !== "note")
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ");

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium font-mono">{name}</p>
        {details && <p className="mt-0.5 text-xs text-muted">{details}</p>}
        {check.note != null && (
          <p className="mt-0.5 text-xs text-[#7a5d1a]">{String(check.note)}</p>
        )}
      </div>
      <CheckBadge status={String(check.status)} />
    </div>
  );
}

// ─── Persona card ─────────────────────────────────────────────────────────────

function PersonaCard({
  role,
  email,
  scenarios,
}: {
  role: string;
  email: string;
  scenarios: string[];
}) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <p className="text-sm font-semibold capitalize">{role.replace(/_/g, " ")}</p>
      <p className="mt-0.5 text-xs text-muted font-mono">{email}</p>
      <ul className="mt-2 space-y-1">
        {scenarios.map((s) => (
          <li key={s} className="flex items-start gap-2 text-xs text-muted">
            <span className="mt-0.5 text-[10px]">☐</span>
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── UAT personas ─────────────────────────────────────────────────────────────

const UAT_PERSONAS = [
  {
    role: "super_admin",
    email: "super-admin@uat.compound.local",
    scenarios: ["Compound onboarding", "Settings management", "User support console", "Launch readiness gate"],
  },
  {
    role: "compound_admin",
    email: "compound-admin@uat.compound.local",
    scenarios: ["Building & unit management", "Resident invitation flow", "Issue management", "Announcement publishing", "Work order lifecycle"],
  },
  {
    role: "board_member",
    email: "board-member@uat.compound.local",
    scenarios: ["Poll creation & result", "Meeting management & minutes"],
  },
  {
    role: "finance_reviewer",
    email: "finance-reviewer@uat.compound.local",
    scenarios: ["Unit account charges", "Payment submission review", "Finance reports", "Budget management"],
  },
  {
    role: "security_guard",
    email: "security-guard@uat.compound.local",
    scenarios: ["Visitor pass validation", "Incident reporting", "Shift check-in / check-out"],
  },
  {
    role: "support_agent",
    email: "support-agent@uat.compound.local",
    scenarios: ["Duplicate detection", "Account merge"],
  },
  {
    role: "resident_owner",
    email: "resident-owner@uat.compound.local",
    scenarios: ["Onboarding document upload", "Issue submission", "Privacy consent", "Data export request"],
  },
  {
    role: "resident_tenant",
    email: "resident-tenant@uat.compound.local",
    scenarios: ["Visitor request", "Announcement feed", "Voting eligibility"],
  },
];

// ─── Pilot rollout waves ──────────────────────────────────────────────────────

const PILOT_WAVES = [
  {
    wave: "Wave 1 — Day 1",
    scope: "1 building · 1–2 floors · 20–30 residents",
    criteria: ["Zero data-loss incidents", "All core workflows complete without errors", "Notification delivery > 95%"],
  },
  {
    wave: "Wave 2 — Day 3–5",
    scope: "Full Building A (all floors)",
    criteria: ["First payment cycle processed correctly", "Security gate validation used", "No P1/P2 bugs in 48 hours"],
  },
  {
    wave: "Wave 3 — Day 7",
    scope: "All remaining buildings / compounds",
    criteria: ["80%+ of invited residents onboard within 7 days", "Audit log shows consistent usage patterns"],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LaunchPage() {
  await requireAdminUser(getCurrentUser, ["super_admin"]);

  const [t, readiness] = await Promise.all([
    getTranslations("Launch"),
    getLaunchReadiness(),
  ]);

  const isReady = readiness?.overall === "ready";

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
          <div className="flex items-center gap-3">
            {readiness && (
              <span
                className={`inline-flex rounded-lg px-4 py-2 text-sm font-bold ${
                  isReady
                    ? "bg-[#e6f3ef] text-brand"
                    : "bg-[#fff3f2] text-danger"
                }`}
              >
                {isReady ? "✓ READY FOR LAUNCH" : "✗ NOT READY"}
              </span>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-8 px-5 py-6 lg:px-8">

        {/* Warnings banner */}
        {(readiness?.warnings ?? []).length > 0 && (
          <div className="rounded-lg border border-[#e7d7a9] bg-[#fff8e8] px-4 py-3">
            <p className="text-sm font-semibold text-[#7a5d1a]">{t("warningsTitle")}</p>
            <ul className="mt-2 space-y-1">
              {readiness!.warnings.map((w, i) => (
                <li key={i} className="text-xs text-[#7a5d1a]">• {w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Infrastructure checks */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {t("infra.title")}
          </h2>
          <div className="divide-y divide-line rounded-lg border border-line bg-panel px-5">
            {readiness
              ? Object.entries(readiness.infrastructure).map(([name, check]) => (
                  <CheckRow key={name} name={name} check={check} />
                ))
              : (
                <p className="py-6 text-center text-sm text-muted">{t("unavailable")}</p>
              )}
          </div>
        </div>

        {/* Launch-specific checks */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {t("launch.title")}
          </h2>
          <div className="divide-y divide-line rounded-lg border border-line bg-panel px-5">
            {readiness
              ? Object.entries(readiness.launch).map(([name, check]) => (
                  <CheckRow key={name} name={name} check={check} />
                ))
              : (
                <p className="py-6 text-center text-sm text-muted">{t("unavailable")}</p>
              )}
          </div>
        </div>

        {/* UAT personas */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {t("uat.title")}
          </h2>
          <p className="mb-4 text-xs text-muted">{t("uat.passwordNote")}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {UAT_PERSONAS.map((p) => (
              <PersonaCard key={p.role} {...p} />
            ))}
          </div>
        </div>

        {/* Pilot rollout waves */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {t("pilot.title")}
          </h2>
          <div className="space-y-3">
            {PILOT_WAVES.map((wave) => (
              <div key={wave.wave} className="rounded-lg border border-line bg-panel p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{wave.wave}</p>
                  <span className="text-xs text-muted">{wave.scope}</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {wave.criteria.map((c) => (
                    <li key={c} className="flex items-start gap-2 text-xs text-muted">
                      <span className="mt-0.5 text-[10px]">☐</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Handover & docs links */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {t("handover.title")}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: t("handover.runbook"),        href: "https://github.com/mostafaspace/compound/blob/main/docs/launch/runbook.md" },
              { label: t("handover.uatScenarios"),   href: "https://github.com/mostafaspace/compound/blob/main/docs/launch/uat-scenarios.md" },
              { label: t("handover.trainingGuide"),  href: "https://github.com/mostafaspace/compound/blob/main/docs/launch/training-guide.md" },
              { label: t("handover.launchChecklist"), href: "https://github.com/mostafaspace/compound/blob/main/docs/launch/launch-checklist.md" },
              { label: t("handover.qaMatrix"),       href: "https://github.com/mostafaspace/compound/blob/main/docs/launch/qa-test-matrix.md" },
            ].map((doc) => (
              <a
                key={doc.label}
                href={doc.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-line bg-panel px-4 py-3 text-sm font-medium text-brand hover:bg-background"
              >
                <span>↗</span>
                {doc.label}
              </a>
            ))}
          </div>
        </div>

        {/* Support contacts */}
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {t("support.title")}
          </h2>
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {[
              { role: t("support.techLead"),      contact: "tech-lead@compound.app" },
              { role: t("support.productOwner"),  contact: "product@compound.app" },
              { role: t("support.dba"),           contact: "dba@compound.app" },
              { role: t("support.supportLead"),   contact: "support@compound.app" },
            ].map((c) => (
              <div key={c.role} className="flex items-center justify-between rounded border border-line px-3 py-2">
                <span className="text-muted text-xs">{c.role}</span>
                <a href={`mailto:${c.contact}`} className="text-xs font-mono text-brand hover:underline">
                  {c.contact}
                </a>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            {t("support.escalationPath")}
          </p>
        </div>

      </section>
    </main>
  );
}
