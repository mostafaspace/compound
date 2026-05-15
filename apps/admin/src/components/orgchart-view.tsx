"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  useLayoutEffect,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { OrgChart } from "d3-org-chart";

import { AdminUserPicker } from "@/components/admin-user-picker";
import type { AdminUserOption } from "@/lib/admin-user-options";
import type {
  OrgChartResponse,
  OrgChartRepresentative,
} from "@/lib/orgchart";
import {
  mergeRepresentativeWithPersonDetail,
  parseAssignmentUserId,
} from "@/lib/orgchart";
import {
  getPersonDetail,
  assignCompoundHead,
  assignBuildingHead,
  assignFloorRepresentative,
  expireRepresentativeAssignment,
} from "@/lib/orgchart-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlatNode {
  id: string;
  parentId: string | null;
  name: string;
  role: string;
  type: "compound" | "building" | "floor";
  label: string;
  code?: string;
  photoUrl?: string | null;
  rep?: OrgChartRepresentative;
  isVacant?: boolean;
}

interface OrgChartViewProps {
  data: OrgChartResponse;
  compoundId: string;
  assignableUsers?: AdminUserOption[];
  canManage?: boolean;
}

interface OrgChartDatum {
  data: FlatNode;
}

interface OrgChartInstance {
  clearHighlighting(): OrgChartInstance;
  compactMarginBetween(callback: () => number): OrgChartInstance;
  compactMarginPair(callback: () => number): OrgChartInstance;
  container(element: HTMLDivElement): OrgChartInstance;
  data(data: FlatNode[]): OrgChartInstance;
  childrenMargin(callback: () => number): OrgChartInstance;
  exportImg(): void;
  fit(): void;
  neighbourMargin(callback: () => number): OrgChartInstance;
  nodeContent(callback: (datum: OrgChartDatum) => string): OrgChartInstance;
  nodeHeight(callback: () => number): OrgChartInstance;
  nodeWidth(callback: () => number): OrgChartInstance;
  onNodeClick(callback: (datum: OrgChartDatum) => void): OrgChartInstance;
  render(): OrgChartInstance;
  setUpToTheRootHighlighted(id: string): OrgChartInstance;
  siblingsMargin(callback: () => number): OrgChartInstance;
  zoomIn(): void;
  zoomOut(): void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  president: { bg: "#EEF2FF", color: "#4F46E5", border: "#C7D2FE" },
  building_representative: { bg: "#F0F9FF", color: "#0284C7", border: "#BAE6FD" },
  floor_representative: { bg: "#F5F3FF", color: "#7C3AED", border: "#DDD6FE" },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const AVATAR_HUE = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#6366f1"];
function avatarColor(id: number) {
  return AVATAR_HUE[id % AVATAR_HUE.length];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OrgChartView({ data, assignableUsers = [], canManage = false }: OrgChartViewProps) {
  const router = useRouter();
  const t = useTranslations("OrgChart");
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<OrgChartInstance | null>(null);

  // UI State
  const [selectedRep, setSelectedRep] = useState<OrgChartRepresentative | null>(null);
  const [selectedRepLoading, setSelectedRepLoading] = useState(false);
  const [selectedRepError, setSelectedRepError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  
  // Assignment State
  const [assigningState, setAssigningState] = useState<{ id: string; type: string; label: string } | null>(null);
  const [assignmentUserIdInput, setAssignmentUserIdInput] = useState("");
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const [unassigningRep, setUnassigningRep] = useState<OrgChartRepresentative | null>(null);
  const [unassignError, setUnassignError] = useState<string | null>(null);
  const [unassignSubmitting, setUnassignSubmitting] = useState(false);

  // 1. Flatten data for D3-Org-Chart
  const flatData = useMemo(() => {
    const list: FlatNode[] = [];
    
    // Root: Compound
    const rootRep = data.compound.representatives.find(r => r.role === "president");
    list.push({
      id: data.compound.id,
      parentId: null,
      name: rootRep?.user.name ?? t("vacantPosition"),
      role: "president",
      type: "compound",
      label: data.compound.name,
      photoUrl: rootRep?.user.photoUrl,
      rep: rootRep,
      isVacant: !rootRep
    });

    // Buildings
    data.buildings.forEach(b => {
      // Filter by building if applicable
      if (buildingFilter !== "all" && b.id !== buildingFilter) return;

      const bRep = b.representatives.find(r => r.role === "building_representative");
      list.push({
        id: b.id,
        parentId: data.compound.id,
        name: bRep?.user.name ?? t("vacantPosition"),
        role: "building_representative",
        type: "building",
        label: b.name,
        photoUrl: bRep?.user.photoUrl,
        rep: bRep,
        isVacant: !bRep
      });

      // Floors
      b.floors.forEach(f => {
        const fRep = f.representatives.find(r => r.role === "floor_representative");
        list.push({
          id: f.id,
          parentId: b.id,
          name: fRep?.user.name ?? t("vacantPosition"),
          role: "floor_representative",
          type: "floor",
          label: f.label,
          photoUrl: fRep?.user.photoUrl,
          rep: fRep,
          isVacant: !fRep
        });
      });
    });

    return list;
  }, [data, buildingFilter, t]);

  const handleSelectRepresentative = useCallback(async (rep: OrgChartRepresentative) => {
    setSelectedRep(rep);
    setSelectedRepError(null);
    setSelectedRepLoading(true);

    try {
      const detail = await getPersonDetail(rep.user.id);
      setSelectedRep((current) => {
        if (!current || current.id !== rep.id) return current;
        return mergeRepresentativeWithPersonDetail(current, detail);
      });
    } catch {
      setSelectedRepError(t("errors.profileLoad"));
    } finally {
      setSelectedRepLoading(false);
    }
  }, [t]);

  const getAssignmentTarget = useCallback((rep: OrgChartRepresentative) => {
    if (rep.scopeLevel === "compound") {
      return {
        id: rep.compoundId ?? data.compound.id,
        type: "compound",
        label: data.compound.name,
      };
    }

    if (rep.scopeLevel === "building" && rep.buildingId) {
      const building = data.buildings.find((item) => item.id === rep.buildingId);
      return {
        id: rep.buildingId,
        type: "building",
        label: building?.name ?? t("scope.building", { id: rep.buildingId.slice(0, 8) }),
      };
    }

    if (rep.scopeLevel === "floor" && rep.floorId) {
      const building = data.buildings.find((item) => item.floors.some((floor) => floor.id === rep.floorId));
      const floor = building?.floors.find((item) => item.id === rep.floorId);
      return {
        id: rep.floorId,
        type: "floor",
        label: [building?.name, floor?.label].filter(Boolean).join(" · ") || t("scope.floor", { id: rep.floorId.slice(0, 8) }),
      };
    }

    return null;
  }, [data, t]);

  const startReplacementAssignment = useCallback((rep: OrgChartRepresentative) => {
    const target = getAssignmentTarget(rep);
    if (!target) {
      setSelectedRepError(t("errors.requestFailed"));
      return;
    }

    setAssignmentUserIdInput("");
    setAssignmentError(null);
    setAssigningState(target);
  }, [getAssignmentTarget, t]);

  const confirmUnassign = useCallback(async () => {
    if (!unassigningRep) return;

    setUnassignSubmitting(true);
    setUnassignError(null);

    try {
      await expireRepresentativeAssignment(unassigningRep.id);
      setUnassigningRep(null);
      setSelectedRep(null);
      router.refresh();
    } catch {
      setUnassignError(t("errors.requestFailed"));
    } finally {
      setUnassignSubmitting(false);
    }
  }, [router, t, unassigningRep]);

  // 2. Initialize / Update Chart
  useLayoutEffect(() => {
    if (!chartContainerRef.current) return;

    if (!chartRef.current) {
      chartRef.current = new OrgChart() as unknown as OrgChartInstance;
    }

    const chart = chartRef.current;

    chart
      .container(chartContainerRef.current)
      .data(flatData)
      .nodeHeight(() => 140)
      .nodeWidth(() => 280)
      .childrenMargin(() => 80)
      .compactMarginBetween(() => 50)
      .compactMarginPair(() => 100)
      .neighbourMargin(() => 40)
      .siblingsMargin(() => 40)
      .onNodeClick((d) => {
        if (d.data.isVacant) {
          if (canManage) {
            setAssignmentUserIdInput("");
            setAssignmentError(null);
            setAssigningState({ id: d.data.id, type: d.data.type, label: d.data.label });
          }
        } else if (d.data.rep) {
          handleSelectRepresentative(d.data.rep);
        }
      })
      .nodeContent((d) => {
        const color = ROLE_BADGE[d.data.role] || { bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" };
        const initials = getInitials(d.data.name);
        const avatarBg = d.data.isVacant ? "#f1f5f9" : avatarColor(d.data.rep?.user.id ?? 0);
        
        return `
          <div class="p-2 h-full w-full">
            <div class="bg-white h-full w-full rounded-2xl border-2 transition-all duration-300 shadow-lg flex flex-col items-center justify-center gap-2 ${d.data.isVacant ? 'border-dashed border-slate-300 opacity-90' : 'border-transparent hover:border-indigo-500'}">
              <div class="absolute -top-3 px-3 py-1 bg-white border-2 border-indigo-100 rounded-full shadow-sm">
                <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">${d.data.label}</span>
              </div>
              
              <div class="flex items-center gap-3 w-full px-4">
                <div class="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden border-4 border-slate-50 shadow-sm shrink-0" style="background-color: ${avatarBg}">
                  ${d.data.photoUrl ? `<img src="${d.data.photoUrl}" class="w-full h-full object-cover" />` : `<span class="text-white font-black text-lg">${d.data.isVacant ? '+' : initials}</span>`}
                </div>
                
                <div class="min-w-0 flex-1">
                  <div class="text-[14px] font-black text-slate-900 truncate">${d.data.name}</div>
                  <div class="text-[10px] text-slate-500 font-bold truncate">${t(`roles.${d.data.role}`)}</div>
                  <div class="inline-flex items-center px-2 py-0.5 mt-2 rounded-lg text-[9px] font-black uppercase tracking-tighter border" style="background-color: ${color.bg}; color: ${color.color}; border-color: ${color.border}">
                    ${t(`roles.${d.data.role}`)}
                  </div>
                </div>
              </div>

              ${d.data.isVacant ? `
                <div class="mt-1">
                  <span class="text-[9px] font-black bg-indigo-600 text-white px-3 py-1 rounded-full shadow-sm uppercase">${t("assignRep")}</span>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      })
      .render();

    chart.fit();

    return () => {
      // Cleanup if needed
    };
  }, [flatData, t, canManage, handleSelectRepresentative]);

  // 3. Sync Search
  useEffect(() => {
    if (chartRef.current && searchQuery) {
      chartRef.current.clearHighlighting();
      const nodes = flatData.filter(d => 
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        d.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (nodes.length > 0) {
        chartRef.current.setUpToTheRootHighlighted(nodes[0].id).render();
      }
    } else if (chartRef.current) {
      chartRef.current.clearHighlighting().render();
    }
  }, [searchQuery, flatData]);

  const submitAssignment = useCallback(async () => {
    if (!assigningState) return;
    const userId = parseAssignmentUserId(assignmentUserIdInput);
    if (userId === null) {
      setAssignmentError(t("errors.validUserId"));
      return;
    }

    setAssignmentSubmitting(true);
    setAssignmentError(null);

    try {
      let success = false;
      if (assigningState.type === "compound") success = await assignCompoundHead(assigningState.id, userId);
      else if (assigningState.type === "building") success = await assignBuildingHead(assigningState.id, userId);
      else if (assigningState.type === "floor") success = await assignFloorRepresentative(assigningState.id, userId);

      if (success) {
        setAssigningState(null);
        router.refresh();
      } else {
        setAssignmentError(t("errors.requestFailed"));
      }
    } catch {
      setAssignmentError(t("errors.requestFailed"));
    } finally {
      setAssignmentSubmitting(false);
    }
  }, [assigningState, assignmentUserIdInput, router, t]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-160px)]">
      {/* Premium Toolbar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-xl p-4 rounded-[2.5rem] border-2 border-slate-100 shadow-premium-sm">
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <button type="button" aria-label={t("toolbar.zoomIn")} onClick={() => chartRef.current?.zoomIn()} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white transition-all text-slate-600">
               <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
            </button>
            <button type="button" aria-label={t("toolbar.fit")} onClick={() => chartRef.current?.fit()} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white transition-all text-slate-600">
               <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>
            </button>
            <button type="button" aria-label={t("toolbar.zoomOut")} onClick={() => chartRef.current?.zoomOut()} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white transition-all text-slate-600">
               <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14" strokeLinecap="round"/></svg>
            </button>
          </div>

          <div className="relative flex-1 max-w-sm">
            <label htmlFor="org-chart-search" className="sr-only">{t("toolbar.searchLabel")}</label>
            <input
              id="org-chart-search"
              name="org_chart_search"
              type="text"
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 ps-12 pe-4 rounded-2xl border-2 border-slate-100 bg-white focus:border-indigo-500 outline-none transition-all font-bold text-sm"
            />
            <div className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3" strokeLinecap="round"/></svg>
            </div>
          </div>

          <label htmlFor="org-chart-building-filter" className="sr-only">{t("toolbar.buildingFilterLabel")}</label>
          <select 
            id="org-chart-building-filter"
            name="org_chart_building_filter"
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="h-12 px-6 rounded-2xl border-2 border-slate-100 bg-white font-black text-xs uppercase tracking-widest outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">{t("allBuildings")}</option>
            {data.buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-4">
           <button type="button" onClick={() => chartRef.current?.exportImg()} className="h-12 px-6 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg">{t("exportImage")}</button>
        </div>
      </div>

      {/* Main Canvas Container */}
      <div className="relative flex-1 overflow-hidden rounded-[3rem] border-2 border-slate-100 bg-[#F8FAFC] shadow-inner">
        <div ref={chartContainerRef} className="w-full h-full" />
        
        {/* Floating Controls Hint */}
        <div className="absolute bottom-8 start-8 flex items-center gap-4">
           <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{t("liveChart")}</span>
           </div>
        </div>
      </div>

      {/* Side Detail Panel (Same as V1 but polished) */}
      {selectedRep && (
        <div className="absolute top-4 end-4 bottom-4 w-96 bg-white/98 backdrop-blur-2xl border-2 border-slate-100 rounded-[2.5rem] shadow-2xl z-[60] flex flex-col overflow-hidden animate-in slide-in-from-right duration-500">
           <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-xl text-slate-900">{t("profile.title")}</h3>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">{t("profile.subtitle")}</p>
              </div>
              <button type="button" aria-label={t("profile.close")} onClick={() => setSelectedRep(null)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-all">✕</button>
           </div>
           <div className="flex-1 overflow-y-auto p-10 flex flex-col items-center">
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden mb-6">
                {selectedRep.user.photoUrl ? (
                  <img src={selectedRep.user.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-black text-white" style={{ backgroundColor: avatarColor(selectedRep.user.id) }}>
                    {getInitials(selectedRep.user.name)}
                  </div>
                )}
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-1">{selectedRep.user.name}</h2>
              <div className="px-4 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-10">
                {t(`roles.${selectedRep.role}`)}
              </div>
              {selectedRepLoading ? (
                <p className="mb-4 text-xs font-bold text-slate-500">{t("profile.loading")}</p>
              ) : null}
              {selectedRepError ? (
                <p className="mb-4 text-xs font-bold text-red-500">{selectedRepError}</p>
              ) : null}

              <div className="w-full space-y-6">
                 <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{t("profile.email")}</p>
                    <p className="font-bold text-slate-900">{selectedRep.user.email || "—"}</p>
                 </div>
                 <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{t("profile.phone")}</p>
                    <p className="font-bold text-slate-900">{selectedRep.user.phone || "—"}</p>
                 </div>
              </div>
           </div>
           <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
              {canManage ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-3">
                  <p className="px-2 pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("profile.manageTitle")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => startReplacementAssignment(selectedRep)}
                      className="flex h-12 items-center justify-center rounded-2xl bg-indigo-600 px-3 text-center text-xs font-black text-white shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700"
                    >
                      {t("profile.change")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUnassignError(null);
                        setUnassigningRep(selectedRep);
                      }}
                      className="flex h-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-3 text-center text-xs font-black text-red-600 transition-all hover:bg-red-100"
                    >
                      {t("profile.unassign")}
                    </button>
                  </div>
                </div>
              ) : null}
              <Link href={`/support/users/${selectedRep.user.id}`} className="flex h-14 w-full items-center justify-center rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all">{t("profile.viewFull")}</Link>
           </div>
        </div>
      )}

      {/* Unassign Confirmation */}
      {unassigningRep && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
           <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M3 6h18" strokeLinecap="round" />
                  <path d="M8 6V4h8v2" strokeLinecap="round" />
                  <path d="M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 11v5M14 11v5" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-3">{t("unassign.title")}</h3>
              <p className="text-slate-500 font-medium leading-7">
                {t("unassign.body", {
                  name: unassigningRep.user.name,
                  role: t(`roles.${unassigningRep.role}`),
                })}
              </p>

              {unassignError ? <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{unassignError}</p> : null}

              <div className="flex gap-3 pt-8">
                <button
                  type="button"
                  onClick={() => {
                    setUnassigningRep(null);
                    setUnassignError(null);
                  }}
                  className="flex-1 h-14 rounded-2xl bg-slate-100 text-slate-600 font-black text-sm hover:bg-slate-200 transition-all"
                >
                  {t("unassign.cancel")}
                </button>
                <button
                  type="button"
                  onClick={confirmUnassign}
                  disabled={unassignSubmitting}
                  className="flex-1 h-14 rounded-2xl bg-red-600 text-white font-black text-sm hover:bg-red-700 disabled:opacity-50 shadow-xl shadow-red-100 transition-all"
                >
                  {unassignSubmitting ? t("unassign.processing") : t("unassign.confirm")}
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Assignment Modal (Polished) */}
      {assigningState && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
           <div className="w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden p-10">
              <h3 className="text-2xl font-black text-slate-900 mb-2">{t("assignment.title")}</h3>
              <p className="text-slate-500 font-medium mb-8">{t("assignment.for")} <span className="text-indigo-600 font-black">{assigningState.label}</span></p>
              
              <div className="space-y-6">
                 <AdminUserPicker
                    initialUsers={assignableUsers}
                    label={t("assignment.user")}
                    name="representative_user"
                    onUserChange={(user) => setAssignmentUserIdInput(user ? String(user.id) : "")}
                    placeholder={t("assignment.userSearchPlaceholder")}
                    required
                    searchStatus="active"
                    helperText={t("assignment.userHelper")}
                 />
                 {assignmentError && <p className="text-red-500 text-xs font-bold px-2">{assignmentError}</p>}
                 
                 <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => {
                        setAssigningState(null);
                        setAssignmentUserIdInput("");
                        setAssignmentError(null);
                      }}
                      className="flex-1 h-14 rounded-2xl bg-slate-100 text-slate-600 font-black text-sm hover:bg-slate-200 transition-all"
                    >
                      {t("assignment.cancel")}
                    </button>
                    <button 
                      onClick={submitAssignment} 
                      disabled={assignmentSubmitting}
                      className="flex-1 h-14 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 disabled:opacity-50 shadow-xl shadow-indigo-200 transition-all"
                    >
                      {assignmentSubmitting ? t("assignment.processing") : t("assignment.confirm")}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
