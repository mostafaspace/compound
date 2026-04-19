import type { OrgChartResponse, OrgChartRepresentative, OrgChartBuilding } from "@/lib/orgchart";
import Link from "next/link";

interface OrgChartViewProps {
  data: OrgChartResponse;
  compoundId: string;
  canManage?: boolean;
}

export function OrgChartView({ data, compoundId, canManage = false }: OrgChartViewProps) {
  const formatRoleLabel = (role: string): string => {
    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="space-y-6">
      {/* Compound Level */}
      <section className="rounded-lg border border-line bg-panel p-5">
        <h2 className="text-lg font-semibold">{data.compound.name} ({data.compound.code})</h2>
        {data.compound.representatives.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No representatives assigned at compound level.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.compound.representatives.map((rep: OrgChartRepresentative) => (
              <div key={rep.id} className="rounded border border-line bg-background p-3">
                <p className="font-semibold text-foreground">{rep.user.name}</p>
                <p className="text-xs text-muted">{formatRoleLabel(rep.role)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Building Level */}
      {data.buildings.length === 0 ? (
        <p className="text-sm text-muted">No buildings in this compound.</p>
      ) : (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Buildings</h2>
          {data.buildings.map((building: OrgChartBuilding) => (
            <div key={building.id} className="rounded-lg border border-line bg-panel p-5">
              <h3 className="font-semibold">{building.name} ({building.code})</h3>
              {building.representatives.length === 0 ? (
                <p className="mt-2 text-sm text-muted">No representatives assigned.</p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {building.representatives.map((rep: OrgChartRepresentative) => (
                    <div key={rep.id} className="rounded border border-line bg-background p-3">
                      <p className="font-semibold text-foreground">{rep.user.name}</p>
                      <p className="text-xs text-muted">{formatRoleLabel(rep.role)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {canManage && (
        <div className="flex gap-3">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-strong"
            href={`/compounds/${compoundId}/representatives`}
          >
            Manage representatives
          </Link>
        </div>
      )}
    </div>
  );
}
