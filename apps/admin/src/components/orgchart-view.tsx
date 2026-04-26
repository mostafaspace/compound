"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type WheelEvent,
  type MouseEvent as RMouseEvent,
} from "react";
import Link from "next/link";
import type {
  OrgChartResponse,
  OrgChartRepresentative,
} from "@/lib/orgchart";
import styles from "./orgchart-tree.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TreeNode {
  id: string;
  type: "compound" | "building" | "floor";
  label: string;
  code?: string;
  representatives: OrgChartRepresentative[];
  children: TreeNode[];
}

interface Transform {
  x: number;
  y: number;
  scale: number;
}

interface OrgChartViewProps {
  data: OrgChartResponse;
  compoundId: string;
  canManage?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRole(role: string) {
  return role
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const AVATAR_HUE = [
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#6366f1",
];
function avatarColor(id: number) {
  return AVATAR_HUE[id % AVATAR_HUE.length];
}

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  president: { bg: "#fef3c7", color: "#92400e" },
  treasurer: { bg: "#d1fae5", color: "#065f46" },
  building_representative: { bg: "#dbeafe", color: "#1e40af" },
  floor_representative: { bg: "#ede9fe", color: "#5b21b6" },
  admin_contact: { bg: "#ffedd5", color: "#9a3412" },
  security_contact: { bg: "#fee2e2", color: "#991b1b" },
  association_member: { bg: "#f3f4f6", color: "#374151" },
};

function countAllReps(node: TreeNode): number {
  let total = node.representatives.length;
  for (const c of node.children) total += countAllReps(c);
  return total;
}

function buildTree(data: OrgChartResponse): TreeNode {
  return {
    id: data.compound.id,
    type: "compound",
    label: data.compound.name,
    code: data.compound.code,
    representatives: data.compound.representatives,
    children: (data.buildings ?? []).map((b) => ({
      id: b.id,
      type: "building" as const,
      label: b.name,
      code: b.code,
      representatives: b.representatives,
      children: (b.floors ?? []).map((f) => ({
        id: f.id,
        type: "floor" as const,
        label: f.label,
        representatives: f.representatives,
        children: [],
      })),
    })),
  };
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CompoundIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 22V12h6v10" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="3" width="18" height="18" rx="1.5" strokeLinecap="round" />
      <path strokeLinecap="round" d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </svg>
  );
}

function FloorIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

const NODE_ICON = {
  compound: <CompoundIcon />,
  building: <BuildingIcon />,
  floor: <FloorIcon />,
};

// ─── Person Card ──────────────────────────────────────────────────────────────

function PersonCard({ rep }: { rep: OrgChartRepresentative }) {
  const badge = ROLE_BADGE[rep.role] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-background p-2.5 w-28 shrink-0 select-none">
      {rep.user.photoUrl ? (
        <img
          src={rep.user.photoUrl}
          alt={rep.user.name}
          className="w-11 h-11 rounded-full object-cover ring-2 ring-brand/20"
          draggable={false}
        />
      ) : (
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: avatarColor(rep.user.id) }}
        >
          {getInitials(rep.user.name)}
        </div>
      )}
      <div className="w-full text-center">
        <p className="text-xs font-semibold text-foreground truncate leading-snug">{rep.user.name}</p>
        <span
          className="mt-1 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-tight"
          style={{ backgroundColor: badge.bg, color: badge.color }}
        >
          {formatRole(rep.role)}
        </span>
      </div>
    </div>
  );
}

// ─── Node Card ────────────────────────────────────────────────────────────────

interface NodeCardProps {
  node: TreeNode;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
}

function NodeCard({ node, collapsed, onToggle }: NodeCardProps) {
  const isCollapsed = collapsed.has(node.id);
  const hasChildren = node.children.length > 0;
  const repsHere = node.representatives.length;
  const totalBelow = countAllReps(node) - repsHere;

  return (
    <li className={styles.treeItem}>
      {/* Card */}
      <div className="inline-block rounded-xl border border-line bg-panel shadow-sm hover:shadow-md transition-shadow text-left">
        {/* Header */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line">
          <span className="text-brand">{NODE_ICON[node.type]}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{node.label}</p>
            {node.code && <p className="text-[11px] text-muted">{node.code}</p>}
          </div>
          {hasChildren && (
            <button
              onClick={() => onToggle(node.id)}
              className="ml-1 w-6 h-6 rounded-full border border-line bg-background flex items-center justify-center hover:bg-brand hover:border-brand hover:text-white transition-colors text-muted shrink-0"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5}>
                {isCollapsed ? (
                  <>
                    <line x1="6" y1="1.5" x2="6" y2="10.5" strokeLinecap="round" />
                    <line x1="1.5" y1="6" x2="10.5" y2="6" strokeLinecap="round" />
                  </>
                ) : (
                  <line x1="1.5" y1="6" x2="10.5" y2="6" strokeLinecap="round" />
                )}
              </svg>
            </button>
          )}
        </div>

        {/* Representatives */}
        {repsHere > 0 && (
          <div className="px-3 py-3">
            <div className="flex flex-wrap gap-2 justify-center max-w-xs">
              {node.representatives.map((rep) => (
                <PersonCard key={rep.id} rep={rep} />
              ))}
            </div>
          </div>
        )}

        {/* Footer counts */}
        {(hasChildren || repsHere > 0) && (
          <div className="flex items-center gap-2 px-3.5 py-2 border-t border-line rounded-b-xl bg-background/60 text-xs text-muted">
            {repsHere > 0 && (
              <span>
                {repsHere} {repsHere === 1 ? "member" : "members"}
              </span>
            )}
            {repsHere > 0 && hasChildren && <span className="text-line">·</span>}
            {hasChildren && (
              <span>
                {node.children.length} {node.children.length === 1 ? "direct" : "directs"}
              </span>
            )}
            {hasChildren && totalBelow > 0 && (
              <>
                <span className="text-line">·</span>
                <span>{totalBelow} total</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && !isCollapsed && (
        <ul className={styles.treeChildren}>
          {node.children.map((child) => (
            <NodeCard key={child.id} node={child} collapsed={collapsed} onToggle={onToggle} />
          ))}
        </ul>
      )}
    </li>
  );
}

// ─── Toolbar Icons ─────────────────────────────────────────────────────────────

function ZoomInIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="M10.5 10.5l3 3M6.5 4.5v4M4.5 6.5h4" strokeLinecap="round" />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="M10.5 10.5l3 3M4.5 6.5h4" strokeLinecap="round" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 2.5V6h-3.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 13.5V10H6" />
      <path strokeLinecap="round" d="M13.5 6A6 6 0 003.5 5" />
      <path strokeLinecap="round" d="M2.5 10A6 6 0 0012.5 11" />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OrgChartView({ data, compoundId, canManage = false }: OrgChartViewProps) {
  const root = buildTree(data);

  // Collapse/expand state
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const onToggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Zoom/pan state + ref (ref keeps current values accessible in event handlers)
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const transformRef = useRef(transform);
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, tx: 0, ty: 0 });

  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(2.5, Math.max(0.25, prev.scale * factor)),
    }));
  }, []);

  const handleMouseDown = useCallback((e: RMouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    setIsDragging(true);
    const t = transformRef.current;
    dragStart.current = { mx: e.clientX, my: e.clientY, tx: t.x, ty: t.y };
  }, []);

  const handleMouseMove = useCallback(
    (e: RMouseEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      setTransform((prev) => ({ ...prev, x: dragStart.current.tx + dx, y: dragStart.current.ty + dy }));
    },
    [isDragging],
  );

  const stopDrag = useCallback(() => setIsDragging(false), []);

  const zoom = useCallback((factor: number) => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(2.5, Math.max(0.25, prev.scale * factor)),
    }));
  }, []);

  const resetView = useCallback(() => setTransform({ x: 0, y: 0, scale: 1 }), []);

  const pct = Math.round(transform.scale * 100);

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-0.5 rounded-lg border border-line bg-panel p-1">
          <button
            onClick={() => zoom(1.2)}
            className="w-7 h-7 rounded flex items-center justify-center text-muted hover:text-foreground hover:bg-background transition-colors"
            title="Zoom in"
          >
            <ZoomInIcon />
          </button>
          <span className="w-10 text-center text-xs text-muted tabular-nums">{pct}%</span>
          <button
            onClick={() => zoom(0.83)}
            className="w-7 h-7 rounded flex items-center justify-center text-muted hover:text-foreground hover:bg-background transition-colors"
            title="Zoom out"
          >
            <ZoomOutIcon />
          </button>
          <div className="w-px h-4 bg-line mx-0.5" />
          <button
            onClick={resetView}
            className="w-7 h-7 rounded flex items-center justify-center text-muted hover:text-foreground hover:bg-background transition-colors"
            title="Reset view"
          >
            <ResetIcon />
          </button>
        </div>

        <p className="text-xs text-muted hidden sm:block">Scroll to zoom · Drag to pan</p>

        {canManage && (
          <Link
            href={`/compounds/${compoundId}/representatives`}
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-strong transition-colors"
          >
            Manage representatives
          </Link>
        )}
      </div>

      {/* Canvas */}
      <div
        className="relative overflow-hidden rounded-xl border border-line bg-panel"
        style={{
          height: "calc(100vh - 260px)",
          minHeight: 420,
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
      >
        <div
          className="absolute p-10"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: "top left",
            width: "max-content",
          }}
        >
          <ul className={styles.treeRoot}>
            <NodeCard node={root} collapsed={collapsed} onToggle={onToggle} />
          </ul>
        </div>
      </div>
    </div>
  );
}
