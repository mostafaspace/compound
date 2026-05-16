"use client";

import type { VisitorPassValidationResult, VisitorRequest, VisitorRequestStatus } from "@compound/contracts";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { validateVisitorPassAction, visitorDecisionAction } from "@/app/(admin)/visitors/actions";

interface VisitorGateWorkspaceProps {
  initialVisitors: VisitorRequest[];
}

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options: { formats: string[] }): BarcodeDetectorInstance;
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
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

const ADMIN_TIME_ZONE = "Africa/Cairo";
const preDecisionStatuses: VisitorRequestStatus[] = ["pending", "qr_issued", "arrived"];

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

function CameraIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M6.5 4.25 7.6 3h4.8l1.1 1.25h2A2.5 2.5 0 0 1 18 6.75v7A2.5 2.5 0 0 1 15.5 16h-11A2.5 2.5 0 0 1 2 13.75v-7a2.5 2.5 0 0 1 2.5-2.5h2Zm3.5 9.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Zm0-1.5a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Z" />
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
    timeZone: ADMIN_TIME_ZONE,
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

function canUsePreDecisionAction(status: VisitorRequestStatus): boolean {
  return preDecisionStatuses.includes(status);
}

export function VisitorGateWorkspace({ initialVisitors }: VisitorGateWorkspaceProps) {
  const router = useRouter();
  const [visitors, setVisitors] = useState(initialVisitors);
  const [token, setToken] = useState("");
  const [validation, setValidation] = useState<VisitorPassValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannerMessage, setScannerMessage] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
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

  const runValidation = useCallback((rawToken: string, source: "manual" | "camera" = "manual") => {
    const normalizedToken = rawToken.trim();

    if (normalizedToken.length < 32) {
      setError("Pass token is too short. Scan again or paste the full token.");
      return;
    }

    setError(null);
    setValidation(null);
    setToken(normalizedToken);

    if (source === "camera") {
      setScannerMessage("QR detected. Validating pass.");
    }

    startTransition(async () => {
      try {
        const result = await validateVisitorPassAction(normalizedToken);
        setValidation(result);
        setScannerMessage(
          result.result === "valid"
            ? "Pass found. Security actions are available below."
            : `Pass scanned with result: ${result.result.replaceAll("_", " ")}.`,
        );

        if (source === "camera" && result.visitorRequest) {
          setIsScannerOpen(false);
        }
      } catch {
        setError("Pass validation failed. Check the token and try again.");
        setScannerMessage("Scan could not be validated. Use manual token entry if the QR is damaged.");
      }
    });
  }, []);

  function handleValidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runValidation(token);
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
        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-lg border border-line bg-background p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Camera scan</h2>
                <p className="mt-1 text-sm text-muted">Scan the resident QR pass at the gate.</p>
              </div>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-strong"
                onClick={() => {
                  setScannerMessage(null);
                  setIsScannerOpen(true);
                }}
                type="button"
              >
                <CameraIcon />
                Open camera
              </button>
            </div>
            {scannerMessage ? <p className="mt-3 text-sm font-medium text-muted">{scannerMessage}</p> : null}
          </div>

          <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleValidate}>
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

        <VisitorQrScanner
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScan={(scannedToken) => runValidation(scannedToken, "camera")}
        />

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
      <span className="text-end font-medium">{value}</span>
    </div>
  );
}

function VisitorQrScanner({
  isOpen,
  onClose,
  onScan,
}: {
  isOpen: boolean;
  onClose: () => void;
  onScan: (token: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTokenRef = useRef<string | null>(null);
  const [message, setMessage] = useState("Point the camera at the resident QR pass.");
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCancelled = false;

    async function startScanner() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage("Camera access is not supported in this browser. Use manual token entry.");
        return;
      }

      setIsStarting(true);
      setMessage("Starting camera.");

      const BarcodeDetector = window.BarcodeDetector;

      if (!BarcodeDetector) {
        await startFallbackScanner();
        return;
      }

      await startNativeScanner(BarcodeDetector);
    }

    async function startFallbackScanner() {
      if (!videoRef.current) {
        setIsStarting(false);
        return;
      }

      try {
        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 250,
        });

        scannerControlsRef.current = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              height: { ideal: 720 },
              width: { ideal: 1280 },
            },
          },
          videoRef.current,
          (result, _error, controls) => {
            if (isCancelled) {
              controls.stop();
              return;
            }

            const token = result?.getText()?.trim();

            if (token && token !== lastTokenRef.current) {
              lastTokenRef.current = token;
              setMessage("QR detected.");
              controls.stop();
              onScan(token);
            }
          },
        );

        setMessage("Camera ready. Scanning with fallback QR reader.");
      } catch {
        setMessage("Camera permission was blocked or the fallback scanner is unavailable. Use manual token entry.");
      } finally {
        if (!isCancelled) {
          setIsStarting(false);
        }
      }
    }

    async function startNativeScanner(BarcodeDetector: BarcodeDetectorConstructor) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            height: { ideal: 720 },
            width: { ideal: 1280 },
          },
        });

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (!videoRef.current) {
          return;
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const detector = new BarcodeDetector({ formats: ["qr_code"] });
        setMessage("Camera ready. Hold the QR inside the frame.");

        const scanFrame = async () => {
          if (isCancelled || !videoRef.current) {
            return;
          }

          try {
            if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
              const codes = await detector.detect(videoRef.current);
              const token = codes[0]?.rawValue?.trim();

              if (token && token !== lastTokenRef.current) {
                lastTokenRef.current = token;
                setMessage("QR detected.");
                onScan(token);
                return;
              }
            }
          } catch {
            setMessage("Camera scan failed. Reopen the scanner or use manual token entry.");
            return;
          }

          animationFrameRef.current = window.requestAnimationFrame(scanFrame);
        };

        animationFrameRef.current = window.requestAnimationFrame(scanFrame);
      } catch {
        setMessage("Camera permission was blocked or the camera is unavailable. Use manual token entry.");
      } finally {
        if (!isCancelled) {
          setIsStarting(false);
        }
      }
    }

    void startScanner();

    return () => {
      isCancelled = true;

      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      lastTokenRef.current = null;
    };
  }, [isOpen, onScan]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-2xl rounded-lg bg-panel shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-line p-4">
          <div>
            <h2 className="text-xl font-semibold">Scan visitor QR</h2>
            <p className="mt-1 text-sm text-muted">{message}</p>
          </div>
          <button
            aria-label="Close scanner"
            className="inline-flex size-11 items-center justify-center rounded-lg border border-line bg-panel text-foreground transition hover:border-brand"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="p-4">
          <div className="relative overflow-hidden rounded-lg border border-line bg-black">
            <video
              ref={videoRef}
              autoPlay
              className="aspect-video w-full object-cover"
              muted
              playsInline
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-52 w-52 rounded-lg border-4 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.32)]" />
            </div>
            {isStarting ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
                Starting camera
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">Use manual token entry if the camera is unavailable or the QR is damaged.</p>
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-panel px-4 text-sm font-semibold text-foreground transition hover:border-brand"
              onClick={onClose}
              type="button"
            >
              Use manual entry
            </button>
          </div>
        </div>
      </div>
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

  return (
    <div className="flex flex-wrap items-start gap-2 lg:justify-end">
      <ActionButton
        disabled={disabled || !["pending", "qr_issued"].includes(visitor.status)}
        onClick={() => onDecision(visitor.id, "arrive")}
      >
        <ClockIcon />
        Arrived
      </ActionButton>
      <ActionButton
        disabled={disabled || !canUsePreDecisionAction(visitor.status)}
        onClick={() => onDecision(visitor.id, "allow")}
        variant="primary"
      >
        <CheckIcon />
        Allow
      </ActionButton>
      <ActionButton
        disabled={disabled || !canUsePreDecisionAction(visitor.status)}
        onClick={() => onDecision(visitor.id, "deny")}
        variant="danger"
      >
        <CloseIcon />
        Deny
      </ActionButton>
      <ActionButton
        disabled={disabled || visitor.status !== "allowed"}
        onClick={() => onDecision(visitor.id, "complete")}
      >
        Complete
      </ActionButton>
      <ActionButton
        disabled={disabled || !canUsePreDecisionAction(visitor.status)}
        onClick={() => onDecision(visitor.id, "cancel")}
      >
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
