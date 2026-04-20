"use client";

import type { VisitorPassValidationResult, VisitorRequest, VisitorRequestStatus } from "@compound/contracts";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";

import { validateVisitorPassAction, visitorDecisionAction } from "@/app/visitors/actions";

interface VisitorGateWorkspaceProps {
  initialVisitors: VisitorRequest[];
}

const statusLabels: Record<VisitorRequestStatus, string> = {
  allowed: "Allowed",
  arrived: "Arrived",
  cancelled: "Cancelled",
  completed: "Completed",
  denied: "Denied",
  pending: "Pending",
  qr_issued: "QR issued",
};

const statusClasses: Record<VisitorRequestStatus, string> = {
  allowed: "bg-[#e6f3ef] text-brand",
  arrived: "bg-[#fff5e5] text-[#8a520c]",
  cancelled: "bg-background text-muted",
  completed: "bg-background text-muted",
  denied: "bg-[#fde8e5] text-danger",
  pending: "bg-background text-muted",
  qr_issued: "bg-[#eaf0ff] text-[#244ea8]",
};

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.32a1 1 0 0 1-1.421.002L3.29 9.227a1 1 0 1 1 1.42-1.408l4.04 4.08 6.54-6.603a1 1 0 0 1 1.414-.006Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L8.94 10l-4.72 4.72a.75.75 0 1 0 1.06 1.06L10 11.06l4.72 4.72a.75.75 0 1 0 1.06-1.06L11.06 10l4.72-4.72a.75.75 0 0 0-1.06-1.06L10 8.94 5.28 4.22Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Zm.75 4a.75.75 0 0 0-1.5 0V10c0 .2.08.39.22.53l2.5 2.5a.75.75 0 1 0 1.06-1.06l-2.28-2.28V6.5Z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 2.25 16 4.5v4.45c0 3.87-2.33 6.84-6 8.8-3.67-1.96-6-4.93-6-8.8V4.5l6-2.25Zm3.25 5.58a.75.75 0 0 0-1.08-1.04L9.1 9.98 7.86 8.7a.75.75 0 1 0-1.08 1.04l1.78 1.85c.14.15.34.23.54.23.2 0 .4-.08.54-.23l3.61-3.76Z" />
    </svg>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function locationLabel(visitor: VisitorRequest): string {
  const unit = visitor.unit;

  if (!unit) {
    return visitor.unitId;
  }

  return [unit.compoundName, unit.buildingName, `Unit ${unit.unitNumber}`].filter(Boolean).join(" / ");
}

function isClosed(status: VisitorRequestStatus): boolean {
  return ["cancelled", "completed", "denied"].includes(status);
}

export function VisitorGateWorkspace({ initialVisitors }: VisitorGateWorkspaceProps) {
  const router = useRouter();
  const [visitors, setVisitors] = useState(initialVisitors);
  const [token, setToken] = useState("");
  const [validation, setValidation] = useState<VisitorPassValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const counts = useMemo(
    () => ({
      active: visitors.filter((visitor) => !isClosed(visitor.status)).length,
      arrived: visitors.filter((visitor) => visitor.status === "arrived").length,
      allowed: visitors.filter((visitor) => visitor.status === "allowed").length,
      closed: visitors.filter((visitor) => isClosed(visitor.status)).length,
    }),
    [visitors],
  );

  function updateVisitor(nextVisitor: VisitorRequest) {
    setVisitors((currentVisitors) =>
      currentVisitors.map((visitor) => (visitor.id === nextVisitor.id ? nextVisitor : visitor)),
    );
    setValidation((currentValidation) =>
      currentValidation?.visitorRequest?.id === nextVisitor.id
        ? { ...currentValidation, visitorRequest: nextVisitor }
        : currentValidation,
    );
  }

  function handleValidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setValidation(null);

    startTransition(async () => {
      try {
        const result = await validateVisitorPassAction(token);
        setValidation(result);
      } catch {
        setError("Pass validation failed. Check the token and try again.");
      }
    });
  }

  function handleDecision(visitorRequestId: string, action: "arrive" | "allow" | "deny" | "complete" | "cancel") {
    const reason =
      action === "deny" || action === "cancel"
        ? window.prompt(action === "deny" ? "Reason for denial" : "Reason for cancellation") ?? undefined
        : undefined;

    if ((action === "deny" || action === "cancel") && reason === undefined) {
      return;
    }

    setError(null);
    setActiveId(visitorRequestId);

    startTransition(async () => {
      try {
        const nextVisitor = await visitorDecisionAction(visitorRequestId, action, reason);
        updateVisitor(nextVisitor);
        router.refresh();
      } catch {
        setError("Visitor action failed. Refresh the page and confirm the pass is still valid.");
      } finally {
        setActiveId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Active passes" value={counts.active} tone="text-brand" />
        <Metric label="At gate" value={counts.arrived} tone="text-accent" />
        <Metric label="Allowed today" value={counts.allowed} tone="text-brand-strong" />
        <Metric label="Closed" value={counts.closed} tone="text-muted" />
      </section>

      <section className="rounded-lg border border-line bg-panel p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <form className="grid flex-1 gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleValidate}>
            <label className="block">
              <span className="text-sm font-semibold text-foreground">Manual pass token</span>
              <input
                className="mt-2 h-11 w-full rounded-lg border border-line bg-background px-3 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                name="token"
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste QR token"
                value={token}
              />
            </label>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60 md:mt-7"
              disabled={isPending || token.trim().length < 32}
              type="submit"
            >
              <ShieldIcon />
              Validate
            </button>
          </form>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-[#f2b8b5] bg-[#fde8e5] px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}

        {validation ? (
          <div className="mt-4 rounded-lg border border-line bg-background p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-lg px-3 py-1 text-sm font-semibold ${
                  validation.result === "valid" ? "bg-[#e6f3ef] text-brand" : "bg-[#fde8e5] text-danger"
                }`}
              >
                {validation.result.replaceAll("_", " ")}
              </span>
              {validation.visitorRequest ? (
                <span className="text-sm text-muted">
                  {validation.visitorRequest.visitorName} / {locationLabel(validation.visitorRequest)}
                </span>
              ) : (
                <span className="text-sm text-muted">No matching visitor request found.</span>
              )}
            </div>
            {validation.visitorRequest ? (
              <div className="mt-4">
                <VisitorActions
                  activeId={activeId}
                  isPending={isPending}
                  onDecision={handleDecision}
                  visitor={validation.visitorRequest}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-line bg-panel">
        <div className="border-b border-line p-5">
          <h2 className="text-xl font-semibold">Gate queue</h2>
          <p className="mt-1 text-sm text-muted">Sorted by expected arrival window.</p>
        </div>

        <div className="divide-y divide-line">
          {visitors.length > 0 ? (
            visitors.map((visitor) => (
              <article className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr_auto]" key={visitor.id}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{visitor.visitorName}</h3>
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusClasses[visitor.status]}`}>
                      {statusLabels[visitor.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">{locationLabel(visitor)}</p>
                  <p className="mt-2 text-sm text-muted">
                    {visitor.visitorPhone || "No phone"} / {visitor.vehiclePlate || "No vehicle plate"}
                  </p>
                  {visitor.notes ? <p className="mt-3 text-sm text-foreground">{visitor.notes}</p> : null}
                </div>

                <div className="grid gap-2 text-sm">
                  <InfoRow label="Starts" value={formatDateTime(visitor.visitStartsAt)} />
                  <InfoRow label="Ends" value={formatDateTime(visitor.visitEndsAt)} />
                  <InfoRow label="Pass" value={visitor.pass ? visitor.pass.status.replaceAll("_", " ") : "Not issued"} />
                  <InfoRow label="Host" value={visitor.host?.name ?? `User ${visitor.hostUserId}`} />
                </div>

                <VisitorActions
                  activeId={activeId}
                  isPending={isPending}
                  onDecision={handleDecision}
                  visitor={visitor}
                />
              </article>
            ))
          ) : (
            <div className="p-8 text-center">
              <p className="text-base font-semibold">No visitor requests yet</p>
              <p className="mt-2 text-sm text-muted">New passes will appear here after residents or staff create them.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <article className="rounded-lg border border-line bg-panel p-5">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className={`mt-3 text-4xl font-semibold ${tone}`}>{value}</p>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line pb-2 last:border-b-0 last:pb-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function VisitorActions({
  activeId,
  isPending,
  onDecision,
  visitor,
}: {
  activeId: string | null;
  isPending: boolean;
  onDecision: (visitorRequestId: string, action: "arrive" | "allow" | "deny" | "complete" | "cancel") => void;
  visitor: VisitorRequest;
}) {
  const disabled = isPending && activeId === visitor.id;
  const closed = isClosed(visitor.status);

  return (
    <div className="flex flex-wrap items-start gap-2 lg:justify-end">
      <ActionButton disabled={disabled || closed} onClick={() => onDecision(visitor.id, "arrive")}>
        <ClockIcon />
        Arrived
      </ActionButton>
      <ActionButton disabled={disabled || closed} onClick={() => onDecision(visitor.id, "allow")} variant="primary">
        <CheckIcon />
        Allow
      </ActionButton>
      <ActionButton disabled={disabled || closed} onClick={() => onDecision(visitor.id, "deny")} variant="danger">
        <CloseIcon />
        Deny
      </ActionButton>
      <ActionButton disabled={disabled || visitor.status !== "allowed"} onClick={() => onDecision(visitor.id, "complete")}>
        Complete
      </ActionButton>
      <ActionButton disabled={disabled || closed} onClick={() => onDecision(visitor.id, "cancel")}>
        Cancel
      </ActionButton>
    </div>
  );
}

function ActionButton({
  children,
  disabled,
  onClick,
  variant = "secondary",
}: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
}) {
  const classes = {
    danger: "border-danger bg-panel text-danger hover:bg-[#fde8e5]",
    primary: "border-brand bg-brand text-white hover:bg-brand-strong",
    secondary: "border-line bg-panel text-foreground hover:border-brand",
  }[variant];

  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${classes}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
