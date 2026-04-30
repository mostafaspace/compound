"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  type WheelEvent,
  type MouseEvent as RMouseEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  OrgChartResponse,
  OrgChartRepresentative,
  OrgChartAssignableUser,
  OrgChartUnit,
} from "@/lib/orgchart";
import {
  formatAssignableUserLabel,
  mergeRepresentativeWithPersonDetail,
  parseAssignmentUserId,
  buildOrgChartTree,
} from "@/lib/orgchart";
import {
  getPersonDetail,
  assignBuildingHead,
  assignFloorRepresentative,
  searchOrgChartAssignableUsers,
} from "@/lib/orgchart-actions";
import styles from "./orgchart-tree.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TreeNode {
  id: string;
  type: "compound" | "building" | "floor";
  label: string;
  code?: string;
  representatives: OrgChartRepresentative[];
  children: TreeNode[];
  units?: OrgChartUnit[];
}

interface AssignmentState {
  node: TreeNode;
  initialUserId?: string;
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

function findAssignableNode(root: TreeNode, representative: OrgChartRepresentative): TreeNode | null {
  if (representative.scopeLevel === "compound") {
    return root;
  }

  for (const building of root.children) {
    if (representative.scopeLevel === "building" && building.id === representative.buildingId) {
      return building;
    }

    for (const floor of building.children) {
      if (representative.scopeLevel === "floor" && floor.id === representative.floorId) {
        return floor;
      }
    }
  }

  return null;
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

// ─── Person Card ──────────────────────────────────────────────────────────────

function PersonCard({ 
  rep, 
  isVacant = false, 
  onClick,
  onAssign
}: { 
  rep?: OrgChartRepresentative; 
  isVacant?: boolean; 
  onClick?: () => void;
  onAssign?: () => void;
}) {
  const badge = rep ? (ROLE_BADGE[rep.role] ?? { bg: "#f3f4f6", color: "#374151" }) : { bg: "#f3f4f6", color: "#64748b" };
  
  return (
    <div 
      onClick={isVacant ? onAssign : onClick}
      className={`group relative flex items-center gap-2.5 rounded-xl border border-line bg-panel p-2 w-60 text-left transition-all ${
        isVacant ? "border-dashed opacity-70 grayscale hover:grayscale-0 hover:border-brand cursor-pointer" : "cursor-pointer hover:border-brand hover:shadow-premium-md hover:-translate-y-0.5"
      }`}
    >
      <div className="relative shrink-0">
        {rep?.user.photoUrl ? (
          <img
            src={rep.user.photoUrl}
            alt={rep.user.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-brand/10 group-hover:ring-brand/30 transition-all"
            draggable={false}
          />
        ) : (
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${isVacant ? "bg-slate-100 text-slate-400 border border-dashed border-slate-300" : ""}`}
            style={!isVacant ? { backgroundColor: avatarColor(rep?.user.id ?? 0) } : {}}
          >
            {isVacant ? "+" : getInitials(rep?.user.name ?? "V")}
          </div>
        )}
      </div>
      
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold text-foreground truncate group-hover:text-brand transition-colors">
          {isVacant ? "Vacant Position" : rep?.user.name}
        </p>
        <p className="text-[10px] text-muted truncate leading-tight">
          {isVacant ? "Click to assign" : formatRole(rep?.role ?? "")}
        </p>
        {!isVacant && (
          <span
            className="inline-block text-[8px] font-black px-1.5 py-0.5 rounded-md mt-1 leading-tight uppercase tracking-widest"
            style={{ backgroundColor: badge.bg, color: badge.color }}
          >
            {rep?.role.replace("_", " ")}
          </span>
        )}
      </div>

      {isVacant && (
         <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[8px] font-black bg-brand text-white px-1.5 py-0.5 rounded-full">ASSIGN</span>
         </div>
      )}
    </div>
  );
}

// ─── Resident Card (Smaller) ──────────────────────────────────────────────────

function ResidentCard({ resident }: { resident: any }) {
  return (
    <div className="flex items-center gap-2 py-1 px-2 hover:bg-slate-50 rounded-lg transition-colors cursor-default">
       <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0" style={{ backgroundColor: avatarColor(resident.id) }}>
          {getInitials(resident.name)}
       </div>
       <span className="text-[10px] font-medium text-muted-foreground truncate">{resident.name}</span>
    </div>
  );
}

// ─── Node Card ────────────────────────────────────────────────────────────────

interface NodeCardProps {
  node: TreeNode;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (rep: OrgChartRepresentative) => void;
  onAssign: (node: TreeNode) => void;
  searchQuery: string;
}

function NodeCard({ node, collapsed, onToggle, onSelect, onAssign, searchQuery }: NodeCardProps) {
  const isCollapsed = collapsed.has(node.id);
  const hasChildren = node.children.length > 0;
  const repsHere = node.representatives;
  
  // Show vacant if no reps at building/floor level
  const showVacant = (node.type === "building" || node.type === "floor") && repsHere.length === 0;
  
  const isHighlighted = searchQuery && (
    node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repsHere.some(r => r.user.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <li className={styles.treeItem}>
      <div className={`inline-block relative ${isHighlighted ? "z-10" : ""}`}>
        {isHighlighted && <div className="absolute -inset-1 bg-brand/30 blur-lg rounded-2xl animate-pulse" />}
        
        <div className={`relative flex flex-col items-center gap-3 transition-all ${isHighlighted ? "scale-105" : ""}`}>
          <div className="bg-brand/10 text-brand text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-brand/20">
            {node.label}
          </div>

          <div className="flex flex-col gap-1.5">
            {repsHere.length > 0 ? (
              repsHere.map((rep) => (
                <PersonCard key={rep.id} rep={rep} onClick={() => onSelect(rep)} />
              ))
            ) : showVacant ? (
              <PersonCard isVacant={true} onAssign={() => onAssign(node)} />
            ) : (
              <div className="px-3 py-1.5 bg-panel border border-line rounded-lg shadow-sm">
                 <p className="text-[11px] font-bold">{node.label}</p>
              </div>
            )}

            {/* Units/Residents preview if at Floor level */}
            {node.type === "floor" && (node as any).units?.length > 0 && (
               <div className="mt-1 w-60 border border-line/40 rounded-xl bg-slate-50/50 p-2 text-left">
                  <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1.5 px-1">Units & Residents</p>
                  <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                     {(node as any).units.map((u: any) => (
                        <div key={u.id} className="border border-line/20 rounded-md p-1 bg-white">
                           <p className="text-[8px] font-black text-brand px-1">U-{u.unitNumber}</p>
                           {u.residents.map((r: any) => <ResidentCard key={r.id} resident={r} />)}
                        </div>
                     ))}
                  </div>
               </div>
            )}
          </div>

          {hasChildren && (
            <button
              onClick={() => onToggle(node.id)}
              className={`w-7 h-7 rounded-full border shadow-sm flex items-center justify-center transition-all bg-background z-20 ${
                isCollapsed ? "border-brand text-brand hover:bg-brand hover:text-white" : "border-line text-muted hover:border-brand hover:text-brand"
              }`}
            >
              {isCollapsed ? (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4}><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
              ) : (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4}><path d="M5 12h14" strokeLinecap="round" /></svg>
              )}
            </button>
          )}
        </div>
      </div>

      {hasChildren && !isCollapsed && (
        <ul className={styles.treeChildren}>
          {node.children.map((child) => (
            <NodeCard 
              key={child.id} 
              node={child} 
              collapsed={collapsed} 
              onToggle={onToggle} 
              onSelect={onSelect}
              onAssign={onAssign}
              searchQuery={searchQuery}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// ─── Additional UI Components ────────────────────────────────────────────────

function Legend() {
  return (
    <div className="hidden lg:flex items-center gap-4 bg-panel/80 backdrop-blur-md border border-line px-4 py-2 rounded-full shadow-premium-sm">
       <span className="text-[10px] font-black text-muted uppercase tracking-widest mr-2">Legend</span>
       {Object.entries(ROLE_BADGE).slice(0, 5).map(([role, color]) => (
          <div key={role} className="flex items-center gap-2">
             <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.color }} />
             <span className="text-[10px] font-bold text-foreground capitalize">{role.replace("_", " ")}</span>
          </div>
       ))}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function ZoomInIcon() { return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>; }
function ZoomOutIcon() { return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14" strokeLinecap="round" /></svg>; }
function ResetIcon() { return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>; }
function DownloadIcon() { return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/></svg>; }

// ─── Main Component ───────────────────────────────────────────────────────────

export function OrgChartView({ data, compoundId, canManage = false }: OrgChartViewProps) {
  const router = useRouter();
  const root = buildOrgChartTree(data) as TreeNode;
  const buildings = root.children;

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedRep, setSelectedRep] = useState<OrgChartRepresentative | null>(null);
  const [selectedRepLoading, setSelectedRepLoading] = useState(false);
  const [selectedRepError, setSelectedRepError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [assigningState, setAssigningState] = useState<AssignmentState | null>(null);
  const [assignmentUserIdInput, setAssignmentUserIdInput] = useState("");
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentCandidates, setAssignmentCandidates] = useState<OrgChartAssignableUser[]>([]);
  const [assignmentSearchLoading, setAssignmentSearchLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);

  const onToggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 0.85 });
  const transformRef = useRef(transform);
  useEffect(() => { transformRef.current = transform; }, [transform]);

  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, tx: 0, ty: 0 });

  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    setTransform((prev) => ({ ...prev, scale: Math.min(2.0, Math.max(0.1, prev.scale * factor)) }));
  }, []);

  const handleMouseDown = useCallback((e: RMouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a, input, select")) return;
    setIsDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, tx: transformRef.current.x, ty: transformRef.current.y };
  }, []);

  const handleMouseMove = useCallback((e: RMouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setTransform((prev) => ({ ...prev, x: dragStart.current.tx + (e.clientX - dragStart.current.mx), y: dragStart.current.ty + (e.clientY - dragStart.current.my) }));
  }, [isDragging]);

  const stopDrag = useCallback(() => setIsDragging(false), []);
  const zoom = (f: number) => setTransform(p => ({ ...p, scale: Math.min(2.0, Math.max(0.1, p.scale * f)) }));
  const resetView = () => setTransform({ x: 0, y: 0, scale: 0.85 });

  // Filtering logic
  const filteredRoot = useMemo(() => {
    if (buildingFilter === "all") return root;
    return {
      ...root,
      children: root.children.filter(c => c.id === buildingFilter)
    };
  }, [root, buildingFilter]);

  const handleSelectRepresentative = useCallback(async (rep: OrgChartRepresentative) => {
    setSelectedRep(rep);
    setSelectedRepError(null);
    setSelectedRepLoading(true);

    try {
      const detail = await getPersonDetail(rep.user.id);
      setSelectedRep((current) => {
        if (!current || current.id !== rep.id) {
          return current;
        }

        return mergeRepresentativeWithPersonDetail(current, detail);
      });
    } catch {
      setSelectedRepError("Could not load full profile details.");
    } finally {
      setSelectedRepLoading(false);
    }
  }, []);

  const openAssignmentModal = useCallback((node: TreeNode, initialUserId?: string) => {
    setAssignmentError(null);
    setAssignmentUserIdInput(initialUserId ?? "");
    setAssignmentSearch("");
    setAssignmentCandidates([]);
    setAssigningState({ node, initialUserId });
  }, []);

  const handleReplaceRepresentative = useCallback((rep: OrgChartRepresentative) => {
    const node = findAssignableNode(root, rep);
    if (!node) {
      setSelectedRepError("Could not resolve the assignment scope for this member.");
      return;
    }

    openAssignmentModal(node, String(rep.user.id));
    setSelectedRep(null);
  }, [openAssignmentModal, root]);

  const submitAssignment = useCallback(async () => {
    if (!assigningState) return;

    const userId = parseAssignmentUserId(assignmentUserIdInput);

    if (userId === null) {
      setAssignmentError("Enter a valid positive user ID.");
      return;
    }

    setAssignmentSubmitting(true);
    setAssignmentError(null);

    try {
      let success = false;

      if (assigningState.node.type === "building") {
        success = await assignBuildingHead(assigningState.node.id, userId);
      } else if (assigningState.node.type === "floor") {
        success = await assignFloorRepresentative(assigningState.node.id, userId);
      }

      if (!success) {
        setAssignmentError("Assignment request failed.");
        return;
      }

      setAssigningState(null);
      setAssignmentUserIdInput("");
      router.refresh();
    } catch {
      setAssignmentError("Assignment request failed.");
    } finally {
      setAssignmentSubmitting(false);
    }
  }, [assigningState, assignmentUserIdInput, router]);

  useEffect(() => {
    if (!assigningState) {
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setAssignmentSearchLoading(true);

      try {
        const candidates = await searchOrgChartAssignableUsers(assignmentSearch);
        if (!cancelled) {
          setAssignmentCandidates(candidates);
        }
      } catch {
        if (!cancelled) {
          setAssignmentCandidates([]);
        }
      } finally {
        if (!cancelled) {
          setAssignmentSearchLoading(false);
        }
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [assigningState, assignmentSearch]);

  return (
    <div className="flex flex-col gap-4">
      {/* Upper Toolbar: Navigation & Filter */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-0.5 rounded-xl border border-line bg-panel p-1 shadow-premium-sm">
            <button onClick={() => zoom(1.1)} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-brand hover:bg-brand/5 transition-all" title="Zoom in"><ZoomInIcon /></button>
            <span className="w-12 text-center text-[11px] font-black text-foreground tabular-nums">{Math.round(transform.scale * 100)}%</span>
            <button onClick={() => zoom(0.9)} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-brand hover:bg-brand/5 transition-all" title="Zoom out"><ZoomOutIcon /></button>
            <div className="w-px h-5 bg-line mx-1" />
            <button onClick={resetView} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-brand hover:bg-brand/5 transition-all" title="Fit to Screen"><ResetIcon /></button>
          </div>

          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/60"><SearchIcon /></div>
            <input
              type="text"
              placeholder="Find member, building, floor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-line bg-panel text-sm font-medium focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none transition-all shadow-premium-sm"
            />
          </div>

          <div className="relative">
            <select 
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="h-11 pl-4 pr-10 rounded-xl border border-line bg-panel text-xs font-bold appearance-none outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all shadow-premium-sm cursor-pointer"
            >
              <option value="all">🏢 All Buildings</option>
              {buildings.map((building) => <option key={building.id} value={building.id}>{building.label}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="m19 9-7 7-7-7" /></svg>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
           <Legend />
           <button 
            onClick={() => window.print()} 
            className="hidden md:flex h-11 items-center gap-2 rounded-xl bg-panel border border-line px-4 text-xs font-bold hover:bg-slate-50 transition-all shadow-premium-sm"
           >
             <DownloadIcon /> Export
           </button>
        </div>
      </div>

      <div className="relative flex group/canvas">
        {/* Canvas */}
        <div
          className="relative flex-1 overflow-hidden rounded-3xl border border-line bg-slate-50/30 backdrop-blur-xl cursor-grab active:cursor-grabbing shadow-inner"
          style={{ height: "calc(100vh - 280px)", minHeight: 600 }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
        >
          {/* Enhanced Grid Background */}
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: "linear-gradient(#2563EB 0.5px, transparent 0.5px), linear-gradient(90deg, #2563EB 0.5px, transparent 0.5px)", backgroundSize: "60px 60px" }} />
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: "linear-gradient(#2563EB 0.5px, transparent 0.5px), linear-gradient(90deg, #2563EB 0.5px, transparent 0.5px)", backgroundSize: "12px 12px" }} />

          <div
            className="absolute p-40"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: "0 0",
              width: "max-content",
            }}
          >
            <ul className={styles.treeRoot}>
              <NodeCard 
                node={filteredRoot} 
                collapsed={collapsed} 
                onToggle={onToggle} 
                onSelect={handleSelectRepresentative}
                onAssign={openAssignmentModal}
                searchQuery={searchQuery}
              />
            </ul>
          </div>

          {/* Canvas Hints */}
          <div className="absolute bottom-6 left-6 pointer-events-none flex items-center gap-3 opacity-0 group-hover/canvas:opacity-100 transition-opacity duration-500">
             <div className="flex items-center gap-2 bg-black/5 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold text-muted-foreground border border-black/5">
                <span className="bg-white px-1.5 py-0.5 rounded border border-line">SPACE + DRAG</span> Panning
             </div>
             <div className="flex items-center gap-2 bg-black/5 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold text-muted-foreground border border-black/5">
                <span className="bg-white px-1.5 py-0.5 rounded border border-line">SCROLL</span> Zooming
             </div>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedRep && (
          <div className="absolute top-4 right-4 bottom-4 w-85 bg-background/98 backdrop-blur-xl border border-line rounded-3xl shadow-premium-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-500 border-brand/10">
            <div className="p-5 border-b border-line flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-black text-foreground tracking-tight">Organization Profile</h3>
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-0.5">Member Insights</p>
              </div>
              <button onClick={() => setSelectedRep(null)} className="w-9 h-9 rounded-full hover:bg-white hover:shadow-sm flex items-center justify-center text-muted transition-all">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-28 h-28 rounded-full border-4 border-white shadow-premium-lg overflow-hidden ring-4 ring-brand/5">
                  {selectedRep.user.photoUrl ? (
                    <img src={selectedRep.user.photoUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white" style={{ backgroundColor: avatarColor(selectedRep.user.id) }}>
                      {getInitials(selectedRep.user.name)}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-brand rounded-full border-4 border-white flex items-center justify-center text-white shadow-md">
                   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
                </div>
              </div>
              
              <h2 className="text-2xl font-black text-foreground tracking-tight leading-none">{selectedRep.user.name}</h2>
              <p className="text-brand font-black text-xs mt-2 uppercase tracking-widest">{formatRole(selectedRep.role)}</p>
              
              <div className="w-full mt-10 space-y-4 text-left">
                <div className="group bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl p-5 border border-line/60 hover:border-brand/30 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                     <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-brand"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg></div>
                     <p className="text-[10px] font-black text-muted uppercase tracking-widest">Email Address</p>
                  </div>
                  <p className="text-sm font-bold text-foreground pl-11">{selectedRep.user.email || (selectedRepLoading ? "Loading..." : "Protected Info")}</p>
                </div>
                
                <div className="group bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl p-5 border border-line/60 hover:border-brand/30 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                     <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-brand"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg></div>
                     <p className="text-[10px] font-black text-muted uppercase tracking-widest">Phone Contact</p>
                  </div>
                  <p className="text-sm font-bold text-foreground pl-11">{selectedRep.user.phone || (selectedRepLoading ? "Loading..." : "Protected Info")}</p>
                </div>

                <div className="group bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl p-5 border border-line/60 hover:border-brand/30 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                     <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-brand"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div>
                     <p className="text-[10px] font-black text-muted uppercase tracking-widest">Current Scope</p>
                  </div>
                  <p className="text-sm font-bold text-foreground pl-11">{selectedRep.scopeLevel.toUpperCase()}: {data.compound.name}</p>
                </div>
              </div>
              {selectedRepError && (
                <div className="mt-4 w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
                  {selectedRepError}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-line bg-slate-50/50 flex flex-col gap-3">
              {canManage && selectedRep.scopeLevel !== "compound" && (
                <button 
                  onClick={() => handleReplaceRepresentative(selectedRep)}
                  className="flex h-12 w-full items-center justify-center rounded-2xl bg-brand text-[13px] font-black text-white hover:bg-brand-strong transition-all shadow-premium-md hover:shadow-premium-lg"
                >
                  Replace Assignment
                </button>
              )}
              <Link
                href={`/users/${selectedRep.user.id}`}
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-white border border-line text-[13px] font-black text-foreground hover:bg-slate-100 transition-all shadow-sm"
              >
                Go to User Profile
              </Link>
            </div>
          </div>
        )}

        {/* Role Assignment Modal (Simplified) */}
        {assigningState && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-md bg-background rounded-3xl shadow-premium-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                 <div className="p-6 border-b border-line flex items-center justify-between">
                    <h3 className="font-black text-lg">Assign Role: {assigningState.node.label}</h3>
                    <button onClick={() => setAssigningState(null)} className="text-muted hover:text-foreground">✕</button>
                 </div>
                 <div className="p-8 flex flex-col gap-6">
                    <div className="p-4 bg-brand/5 border border-brand/10 rounded-2xl">
                       <p className="text-xs text-brand-strong font-bold">You are assigning a new representative for this position. This will automatically expire any active assignment for this scope.</p>
                    </div>
                    
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Search User</label>
                       <input 
                        type="text" 
                        value={assignmentSearch}
                        onChange={(e) => setAssignmentSearch(e.target.value)}
                        placeholder="Search by name, email, or phone" 
                        className="w-full h-12 px-4 rounded-xl border border-line bg-slate-50 focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none transition-all font-bold text-sm"
                       />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Selected User ID</label>
                       <input 
                        type="text" 
                        value={assignmentUserIdInput}
                        onChange={(e) => setAssignmentUserIdInput(e.target.value)}
                        placeholder="Enter numeric user ID" 
                        className="w-full h-12 px-4 rounded-xl border border-line bg-slate-50 focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none transition-all font-bold text-sm"
                       />
                    </div>
                    <div className="rounded-2xl border border-line bg-white/80">
                      <div className="flex items-center justify-between border-b border-line px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted">Matching Users</p>
                        {assignmentSearchLoading && <span className="text-[10px] font-bold text-muted">Searching...</span>}
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {assignmentCandidates.length > 0 ? (
                          assignmentCandidates.map((user) => {
                            const isSelected = String(user.id) === assignmentUserIdInput.trim();
                            return (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => {
                                  setAssignmentUserIdInput(String(user.id));
                                  setAssignmentSearch(user.name);
                                }}
                                className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-all ${
                                  isSelected ? "bg-brand/5" : "hover:bg-slate-50"
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-foreground">{user.name}</p>
                                  <p className="truncate text-xs text-muted">{formatAssignableUserLabel(user)}</p>
                                </div>
                                <span className="shrink-0 rounded-full border border-line px-2 py-1 text-[10px] font-black text-muted">
                                  #{user.id}
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-4 py-6 text-center text-xs font-medium text-muted">
                            {assignmentSearchLoading ? "Searching users..." : "No matching users found."}
                          </div>
                        )}
                      </div>
                    </div>
                    {assignmentError && (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
                        {assignmentError}
                      </div>
                    )}
                 </div>
                 <div className="p-6 bg-slate-50 flex gap-3">
                    <button onClick={() => setAssigningState(null)} className="flex-1 h-12 rounded-2xl border border-line font-bold text-sm hover:bg-white transition-all">Cancel</button>
                    <button 
                      onClick={submitAssignment}
                      disabled={assignmentSubmitting}
                      className="flex-1 h-12 rounded-2xl bg-brand text-white font-black text-sm hover:bg-brand-strong transition-all shadow-md"
                    >
                      {assignmentSubmitting ? "Assigning..." : "Confirm Assignment"}
                    </button>
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
