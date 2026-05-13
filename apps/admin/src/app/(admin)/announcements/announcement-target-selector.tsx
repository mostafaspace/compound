"use client";

import { useMemo, useState } from "react";
import type { AnnouncementTargetType } from "@compound/contracts";

type ComposerTargetType = Extract<AnnouncementTargetType, "compound" | "building" | "floor">;

export interface AnnouncementFloorOption {
  id: string;
  label: string;
  buildingId: string;
  buildingName: string;
}

export interface AnnouncementBuildingOption {
  id: string;
  name: string;
  floors: AnnouncementFloorOption[];
}

interface AnnouncementTargetSelectorProps {
  buildings: AnnouncementBuildingOption[];
  compoundId: string;
  compoundName: string;
  defaultTargetIds: string[];
  defaultTargetType: AnnouncementTargetType;
  labels: {
    title: string;
    description: string;
    compound: string;
    compoundHelp: string;
    buildings: string;
    buildingsHelp: string;
    floors: string;
    floorsHelp: string;
    selected: string;
    none: string;
    noBuildings: string;
    noFloors: string;
    noMatches: string;
    searchPlaceholder: string;
    unsupported: string;
  };
}

function isComposerTargetType(value: AnnouncementTargetType): value is ComposerTargetType {
  return value === "compound" || value === "building" || value === "floor";
}

function targetTypeForComposer(value: AnnouncementTargetType): ComposerTargetType {
  if (value === "building" || value === "floor") return value;
  return "compound";
}

export function AnnouncementTargetSelector({
  buildings,
  compoundId,
  compoundName,
  defaultTargetIds,
  defaultTargetType,
  labels,
}: AnnouncementTargetSelectorProps) {
  const isSupportedTarget = isComposerTargetType(defaultTargetType);
  const initialTargetType = targetTypeForComposer(defaultTargetType);
  const [targetType, setTargetType] = useState<ComposerTargetType>(initialTargetType);
  const [buildingIds, setBuildingIds] = useState<string[]>(
    initialTargetType === "building" ? defaultTargetIds : [],
  );
  const [floorIds, setFloorIds] = useState<string[]>(
    initialTargetType === "floor" ? defaultTargetIds : [],
  );
  const [query, setQuery] = useState("");

  const targetIds = targetType === "compound" ? (compoundId ? [compoundId] : []) : targetType === "building" ? buildingIds : floorIds;
  const selectionCount = targetIds.length;
  const normalizedQuery = query.trim().toLowerCase();
  const floors = useMemo(() => buildings.flatMap((building) => building.floors), [buildings]);
  const visibleBuildings = useMemo(() => {
    if (!normalizedQuery) return buildings;

    return buildings.filter((building) => building.name.toLowerCase().includes(normalizedQuery));
  }, [buildings, normalizedQuery]);
  const visibleFloorGroups = useMemo(() => {
    if (!normalizedQuery) return buildings;

    return buildings
      .map((building) => {
        const buildingMatches = building.name.toLowerCase().includes(normalizedQuery);
        const matchingFloors = buildingMatches
          ? building.floors
          : building.floors.filter((floor) => floor.label.toLowerCase().includes(normalizedQuery));

        return { ...building, floors: matchingFloors };
      })
      .filter((building) => building.floors.length > 0);
  }, [buildings, normalizedQuery]);

  const toggleValue = (value: string, values: string[], setter: (next: string[]) => void) => {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  if (!isSupportedTarget) {
    return (
      <section className="rounded-lg border border-line bg-background p-4">
        <input name="targetType" type="hidden" value={defaultTargetType} />
        {defaultTargetIds.map((id) => (
          <input key={id} name="targetIds" type="hidden" value={id} />
        ))}
        <h3 className="text-sm font-semibold text-foreground">{labels.title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted">{labels.unsupported}</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-line bg-background p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{labels.title}</h3>
        <p className="mt-1 text-xs leading-5 text-muted">{labels.description}</p>
      </div>

      <input name="targetType" type="hidden" value={targetType} />
      {targetIds.map((id) => (
        <input key={id} name="targetIds" type="hidden" value={id} />
      ))}

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

      <div className="mt-4 rounded-lg border border-line bg-panel p-4">
        {targetType === "compound" ? (
          <p className="text-sm font-semibold text-foreground">{compoundName}</p>
        ) : null}

        {targetType !== "compound" ? (
          <input
            className="mb-3 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={labels.searchPlaceholder}
            value={query}
          />
        ) : null}

        {targetType === "building" ? (
          buildings.length === 0 ? (
            <p className="text-sm text-muted">{labels.noBuildings}</p>
          ) : visibleBuildings.length === 0 ? (
            <p className="text-sm text-muted">{labels.noMatches}</p>
          ) : (
            <div className="grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {visibleBuildings.map((building) => (
                <label
                  className="flex min-h-11 items-center gap-3 rounded-lg border border-line bg-background px-3 text-sm font-medium"
                  key={building.id}
                >
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
                          <label
                            className="flex min-h-11 items-center gap-3 rounded-lg border border-line bg-background px-3 text-sm font-medium"
                            key={floor.id}
                          >
                            <input
                              checked={floorIds.includes(floor.id)}
                              className="size-4 accent-[var(--brand)]"
                              onChange={() => toggleValue(floor.id, floorIds, setFloorIds)}
                              type="checkbox"
                            />
                            {floor.label}
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

        <p className="mt-4 text-xs font-semibold text-muted">
          {selectionCount > 0 ? labels.selected.replace("__COUNT__", String(selectionCount)) : labels.none}
        </p>
      </div>
    </section>
  );
}
