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
import { useState } from "react";
import type { CompoundSummary, PollType } from "@compound/contracts";
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
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted select-none px-1"
        aria-label="Drag to reorder"
      >
        ⠿
      </button>
      <input
        value={value}
        onChange={(e) => onChange(id, e.target.value)}
        placeholder={`Option ${index + 1}`}
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
  isSuperAdmin: boolean;
  compounds: CompoundSummary[];
  defaultCompoundId: string;
  lockedCompound: CompoundSummary | null;
  pollTypes: PollType[];
}

let nextId = 1;
function makeId() {
  return `opt-${nextId++}`;
}

export function PollCreateForm({ isSuperAdmin, compounds, defaultCompoundId, lockedCompound, pollTypes }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setError("Please provide at least 2 options.");
      setIsSubmitting(false);
      return;
    }

    try {
      await createPoll({
        compoundId: String(data.get("compoundId") ?? ""),
        pollTypeId: String(data.get("pollTypeId") ?? "") || undefined,
        title: String(data.get("title") ?? "").trim(),
        description: String(data.get("description") ?? "").trim() || undefined,
        isAnonymous: data.get("isAnonymous") === "on",
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
      setError(err instanceof Error ? err.message : "Failed to create poll.");
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
        Compound *
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
              {lockedCompound?.name ?? "No compound access"}
            </div>
          </>
        )}
      </label>

      {/* Title */}
      <label className="block text-xs font-semibold text-muted">
        Title *
        <input
          name="title"
          required
          className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
          placeholder="e.g. Which amenity should we add next?"
        />
      </label>

      {/* Description */}
      <label className="block text-xs font-semibold text-muted">
        Description
        <textarea
          name="description"
          className="mt-1 h-20 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
          placeholder="Optional context for voters"
        />
      </label>

      {/* Category */}
      {pollTypes.length > 0 ? (
        <label className="block text-xs font-semibold text-muted">
          Category
          <select
            name="pollTypeId"
            className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
          >
            <option value="">No category</option>
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
        Eligibility
        <select
          name="eligibility"
          className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
        >
          <option value="all_verified">All verified residents</option>
          <option value="owners_and_residents">Owners and residents</option>
          <option value="owners_only">Owners only</option>
        </select>
      </label>

      {/* End date */}
      <label className="block text-xs font-semibold text-muted">
        Ends At
        <input
          name="endsAt"
          type="datetime-local"
          className="mt-1 h-10 w-full rounded-lg border border-line bg-background px-3 text-sm"
        />
      </label>

      {/* Flags */}
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isAnonymous" className="rounded" />
          Anonymous voting
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="allowMultiple" className="rounded" />
          Allow multiple choices
        </label>
      </div>

      {/* Options — drag to reorder */}
      <div>
        <p className="text-xs font-semibold text-muted">Options * (min. 2, drag ⠿ to reorder)</p>
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
          + Add option
        </button>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Creating…" : "Create Poll"}
      </button>
    </form>
  );
}
