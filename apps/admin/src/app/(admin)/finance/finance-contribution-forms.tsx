"use client";

import { useMemo, useState } from "react";
import type { BuildingDetail } from "@compound/contracts";

type FinanceAction = (formData: FormData) => void | Promise<void>;

interface FinanceContributionFormsProps {
  buildings: BuildingDetail[];
  createContributionAction: FinanceAction;
  labels: {
    amount: string;
    buildings: string;
    buildingsHelp: string;
    compound: string;
    compoundHelp: string;
    description: string;
    floors: string;
    floorsHelp: string;
    noBuildings: string;
    noFloors: string;
    noMatches: string;
    noneSelected: string;
    recipientDescription: string;
    recipientTitle: string;
    searchAudience: string;
    selected: string;
    submitContribution: string;
    contributionSubtitle: string;
    contributionTitle: string;
  };
}

function matches(haystack: string, query: string): boolean {
  return haystack.toLowerCase().includes(query.trim().toLowerCase());
}

type TargetType = "compound" | "building" | "floor";

interface FloorOption {
  id: string;
  label: string;
  buildingId: string;
  buildingName: string;
}

interface BuildingOption {
  id: string;
  name: string;
  floors: FloorOption[];
}

function buildAudience(buildings: BuildingDetail[]): BuildingOption[] {
  return buildings.map((building) => ({
    id: building.id,
    name: building.name,
    floors: (building.floors ?? []).map((floor) => ({
      id: floor.id,
      label: floor.label,
      buildingId: building.id,
      buildingName: building.name,
    })),
  }));
}

function ContributionAudienceSelector({
  buildings: propertyBuildings,
  labels,
}: {
  buildings: BuildingDetail[];
  labels: FinanceContributionFormsProps["labels"];
}) {
  const [targetType, setTargetType] = useState<TargetType>("compound");
  const [buildingIds, setBuildingIds] = useState<string[]>([]);
  const [floorIds, setFloorIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const buildings = useMemo(() => buildAudience(propertyBuildings), [propertyBuildings]);
  const floors = useMemo(() => buildings.flatMap((building) => building.floors), [buildings]);
  const targetIds = targetType === "compound" ? [] : targetType === "building" ? buildingIds : floorIds;
  const normalizedQuery = query.trim().toLowerCase();
  const visibleBuildings = useMemo(() => {
    if (!normalizedQuery) return buildings;

    return buildings.filter((building) => matches(building.name, normalizedQuery));
  }, [buildings, normalizedQuery]);
  const visibleFloorGroups = useMemo(() => {
    if (!normalizedQuery) return buildings;

    return buildings
      .map((building) => {
        const buildingMatches = matches(building.name, normalizedQuery);
        const matchingFloors = buildingMatches
          ? building.floors
          : building.floors.filter((floor) => matches(`${floor.buildingName} ${floor.label}`, normalizedQuery));

        return { ...building, floors: matchingFloors };
      })
      .filter((building) => building.floors.length > 0);
  }, [buildings, normalizedQuery]);
  const selectionCount = targetType === "compound" ? buildings.length : targetIds.length;

  const toggleValue = (value: string, values: string[], setter: (next: string[]) => void) => {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  return (
    <section className="rounded-lg border border-line bg-background p-4 sm:col-span-2">
      <input name="targetType" type="hidden" value={targetType} />
      {targetIds.map((id) => (
        <input key={id} name="targetIds" type="hidden" value={id} />
      ))}
      <h3 className="text-sm font-semibold text-foreground">{labels.recipientTitle}</h3>
      <p className="mt-1 text-xs leading-5 text-muted">{labels.recipientDescription}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          { value: "compound" as const, title: labels.compound, help: labels.compoundHelp },
          { value: "building" as const, title: labels.buildings, help: labels.buildingsHelp },
          { value: "floor" as const, title: labels.floors, help: labels.floorsHelp },
        ].map((option) => (
          <button
            className={`min-h-24 rounded-lg border px-4 py-3 text-start transition ${
              targetType === option.value
                ? "border-brand bg-brand/10 text-foreground"
                : "border-line bg-panel text-muted hover:border-brand hover:text-foreground"
            }`}
            key={option.value}
            onClick={() => {
              setTargetType(option.value);
              setQuery("");
            }}
            type="button"
          >
            <span className="block text-sm font-semibold">{option.title}</span>
            <span className="mt-1 block text-xs leading-5">{option.help}</span>
          </button>
        ))}
      </div>

      {targetType !== "compound" ? (
        <div className="mt-4 rounded-lg border border-line bg-panel p-4">
          <input
            className="mb-3 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={labels.searchAudience}
            value={query}
          />
          {targetType === "building" ? (
            buildings.length === 0 ? (
              <p className="text-sm text-muted">{labels.noBuildings}</p>
            ) : visibleBuildings.length === 0 ? (
              <p className="text-sm text-muted">{labels.noMatches}</p>
            ) : (
              <div className="grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {visibleBuildings.map((building) => (
                  <label className="flex min-h-11 items-center gap-3 rounded-lg border border-line bg-background px-3 text-sm font-medium" key={building.id}>
                    <input
                      checked={buildingIds.includes(building.id)}
                      className="size-4 accent-[var(--brand)]"
                      onChange={() => toggleValue(building.id, buildingIds, setBuildingIds)}
                      type="checkbox"
                    />
                    {building.name}
                  </label>
                ))}
              </div>
            )
          ) : null}
          {targetType === "floor" ? (
            floors.length > 0 ? (
              visibleFloorGroups.length > 0 ? (
                <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
                  {visibleFloorGroups.map((building) => (
                    <div key={building.id}>
                      <p className="mb-2 text-xs font-semibold uppercase text-muted">{building.name}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {building.floors.map((floor) => (
                          <label className="flex min-h-11 items-center gap-3 rounded-lg border border-line bg-background px-3 text-sm font-medium" key={floor.id}>
                            <input
                              checked={floorIds.includes(floor.id)}
                              className="size-4 accent-[var(--brand)]"
                              onChange={() => toggleValue(floor.id, floorIds, setFloorIds)}
                              type="checkbox"
                            />
                            {floor.buildingName} · {floor.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">{labels.noMatches}</p>
              )
            ) : (
              <p className="text-sm text-muted">{labels.noFloors}</p>
            )
          ) : null}
        </div>
      ) : null}

      <p className="mt-4 text-xs font-semibold text-muted">
        {selectionCount > 0 ? labels.selected.replace("__COUNT__", String(selectionCount)) : labels.noneSelected}
      </p>
    </section>
  );
}

export function FinanceContributionForms({
  buildings,
  createContributionAction,
  labels,
}: FinanceContributionFormsProps) {
  return (
    <div className="grid gap-5">
      <form action={createContributionAction} className="rounded-lg border border-line bg-panel p-5">
        <h2 className="text-lg font-semibold">{labels.contributionTitle}</h2>
        <p className="mt-1 text-sm text-muted">{labels.contributionSubtitle}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ContributionAudienceSelector buildings={buildings} labels={labels} />
          <input name="type" type="hidden" value="charge" />
          <label className="text-xs font-semibold text-muted">
            {labels.amount}
            <input className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" name="amount" required step="0.01" type="number" />
          </label>
          <label className="text-xs font-semibold text-muted">
            {labels.description}
            <input className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm" name="description" required />
          </label>
        </div>
        <button className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong" type="submit">
          {labels.submitContribution}
        </button>
      </form>
    </div>
  );
}
