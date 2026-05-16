"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { BuildingDetail, CompoundSummary, PollType } from "@compound/contracts";
import { createPoll } from "../actions";

interface SortableOptionProps {
  id: string;
  value: string;
  index: number;
  onRemove: (id: string) => void;
  onChange: (id: string, value: string) => void;
  canRemove: boolean;
}

function SortableOption({ id, value, index, onRemove, onChange, canRemove }: SortableOptionProps) {
  const t = useTranslations("PollsVoting");
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted select-none px-1"
        aria-label={t("create.dragToReorder")}
      >
        ⠿
      </button>
      <input
        value={value}
        onChange={(e) => onChange(id, e.target.value)}
        placeholder={t("create.optionPlaceholder", { n: index + 1 })}
        required={index < 2}
        className="h-10 flex-1 rounded-lg border border-line bg-background px-3 text-sm"
      />
      {canRemove ? (
        <button
          type="button"
          onClick={() => onRemove(id)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-danger text-xs text-danger hover:bg-[#fff3f2]"
        >
          ✕
        </button>
      ) : (
        <div className="h-8 w-8" />
      )}
    </div>
  );
}

interface Props {
  buildings: BuildingDetail[];
  isSuperAdmin: boolean;
  compounds: CompoundSummary[];
  defaultCompoundId: string;
  lockedCompound: CompoundSummary | null;
  pollTypes: PollType[];
}

type PollTargetType = "compound" | "building" | "floor";

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

function matches(haystack: string, query: string): boolean {
  return haystack.toLowerCase().includes(query.trim().toLowerCase());
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

function PollAudienceSelector({
  buildings: propertyBuildings,
  targetType,
  setTargetType,
  buildingIds,
  setBuildingIds,
  floorIds,
  setFloorIds,
}: {
  buildings: BuildingDetail[];
  targetType: PollTargetType;
  setTargetType: (value: PollTargetType) => void;
  buildingIds: string[];
  setBuildingIds: (value: string[]) => void;
  floorIds: string[];
  setFloorIds: (value: string[]) => void;
}) {
  const t = useTranslations("PollsVoting");
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
    <section className="rounded-lg border border-line bg-background p-4">
      <h3 className="text-sm font-semibold text-foreground">{t("audience.title")}</h3>
      <p className="mt-1 text-xs leading-5 text-muted">
        {t("audience.subtitle")}
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          { value: "compound" as const, title: t("audience.compoundTitle"), help: t("audience.compoundHelp") },
          { value: "building" as const, title: t("audience.buildingsTitle"), help: t("audience.buildingsHelp") },
          { value: "floor" as const, title: t("audience.floorsTitle"), help: t("audience.floorsHelp") },
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
            placeholder={t("audience.searchPlaceholder")}
            value={query}
          />
          {targetType === "building" ? (
            buildings.length === 0 ? (
              <p className="text-sm text-muted">{t("audience.noBuildings")}</p>
            ) : visibleBuildings.length === 0 ? (
              <p className="text-sm text-muted">{t("audience.noMatches")}</p>
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
                <p className="text-sm text-muted">{t("audience.noMatches")}</p>
              )
            ) : (
              <p className="text-sm text-muted">{t("audience.noFloors")}</p>
            )
          ) : null}
        </div>
      ) : null}

      <p className="mt-4 text-xs font-semibold text-muted">
        {selectionCount > 0 ? t("audience.selected", { count: selectionCount }) : t("audience.noneSelected")}
      </p>
    </section>
  );
}

let nextId = 1;
function makeId() {
  return `opt-${nextId++}`;
}

export function PollCreateForm({ buildings, isSuperAdmin, compounds, defaultCompoundId, lockedCompound, pollTypes }: Props) {
  const t = useTranslations("PollsVoting");
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetType, setTargetType] = useState<PollTargetType>("compound");
  const [buildingIds, setBuildingIds] = useState<string[]>([]);
  const [floorIds, setFloorIds] = useState<string[]>([]);
  const [options, setOptions] = useState([
    { id: makeId(), label: "" },
    { id: makeId(), label: "" },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOptions((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  function addOption() {
    setOptions((prev) => [...prev, { id: makeId(), label: "" }]);
  }

  function removeOption(id: string) {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  }

  function changeOption(id: string, value: string) {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, label: value } : o)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = e.currentTarget;
    const data = new FormData(form);

    const filledOptions = options.filter((o) => o.label.trim());
    if (filledOptions.length < 2) {
      setError(t("create.errors.minOptions"));
      setIsSubmitting(false);
      return;
    }
    const targetIds = targetType === "compound" ? [] : targetType === "building" ? buildingIds : floorIds;
    if (targetType !== "compound" && targetIds.length === 0) {
      setError(t("create.errors.targetRequired"));
      setIsSubmitting(false);
      return;
    }

    try {
      await createPoll({
        compoundId: String(data.get("compoundId") ?? ""),
        buildingId: targetType === "building" ? targetIds[0] : undefined,
        targetIds,
        pollTypeId: String(data.get("pollTypeId") ?? "") || undefined,
        title: String(data.get("title") ?? "").trim(),
        description: String(data.get("description") ?? "").trim() || undefined,
        scope: targetType,
        allowMultiple: data.get("allowMultiple") === "on",
        eligibility: (String(data.get("eligibility") ?? "all_verified")) as
          | "all_verified"
          | "owners_and_residents"
          | "owners_only",
        endsAt: String(data.get("endsAt") ?? "").trim() || undefined,
        options: filledOptions.map((o) => ({ label: o.label.trim() })),
      });
      router.push("/polls");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("create.failed"));
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-line bg-panel p-6">
      {error ? (
        <p className="rounded-lg bg-[#fff3f2] px-4 py-3 text-sm font-medium text-danger">{error}</p>
      ) : null}

      {/* Compound */}
      <label className="block text-xs font-semibold text-muted">
        {t("create.compoundRequired")}
        {isSuperAdmin ? (
          <select
            name="compoundId"
            required
            defaultValue={defaultCompoundId}
            className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
          >
            {compounds.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <>
            <input type="hidden" name="compoundId" value={lockedCompound?.id ?? ""} />
            <div className="mt-1 rounded-lg border border-line bg-background px-3 py-2 text-sm">
              {lockedCompound?.name ?? t("create.noCompoundAccess")}
            </div>
          </>
        )}
      </label>

      <PollAudienceSelector
        buildings={buildings}
        targetType={targetType}
        setTargetType={setTargetType}
        buildingIds={buildingIds}
        setBuildingIds={setBuildingIds}
        floorIds={floorIds}
        setFloorIds={setFloorIds}
      />

      {/* Title */}
      <label className="block text-xs font-semibold text-muted">
        {t("fields.title")} *
        <input
          name="title"
          required
          className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
          placeholder={t("create.titlePlaceholder")}
        />
      </label>

      {/* Description */}
      <label className="block text-xs font-semibold text-muted">
        {t("fields.description")}
        <textarea
          name="description"
          className="mt-1 h-20 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
          placeholder={t("create.descriptionPlaceholder")}
        />
      </label>

      {/* Category */}
      {pollTypes.length > 0 ? (
        <label className="block text-xs font-semibold text-muted">
          {t("create.category")}
          <select
            name="pollTypeId"
            className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
          >
            <option value="">{t("create.noCategory")}</option>
            {pollTypes.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {/* Eligibility */}
      <label className="block text-xs font-semibold text-muted">
        {t("fields.eligibility")}
        <select
          name="eligibility"
          className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
        >
          <option value="all_verified">{t("eligibility.all_verified")}</option>
          <option value="owners_and_residents">{t("eligibility.owners_and_residents")}</option>
          <option value="owners_only">{t("eligibility.owners_only")}</option>
        </select>
      </label>

      {/* End date */}
      <label className="block text-xs font-semibold text-muted">
        {t("fields.endsAt")}
        <input
          name="endsAt"
          type="datetime-local"
          className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
        />
      </label>

      {/* Flags */}
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="allowMultiple" className="rounded" />
          {t("create.allowMultiple")}
        </label>
      </div>

      {/* Options — drag to reorder */}
      <div>
        <p className="text-xs font-semibold text-muted">{t("create.optionsHelp")}</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={options.map((o) => o.id)} strategy={verticalListSortingStrategy}>
            <div className="mt-2 space-y-2">
              {options.map((option, index) => (
                <SortableOption
                  key={option.id}
                  id={option.id}
                  value={option.label}
                  index={index}
                  onRemove={removeOption}
                  onChange={changeOption}
                  canRemove={options.length > 2}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <button
          type="button"
          onClick={addOption}
          className="mt-3 text-sm font-semibold text-brand hover:text-brand-strong"
        >
          {t("create.addOption")}
        </button>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t("create.creating") : t("create.submitPoll")}
      </button>
    </form>
  );
}
