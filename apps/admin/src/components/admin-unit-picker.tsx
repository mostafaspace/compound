"use client";

import { useMemo, useRef, useState } from "react";
import type { UnitSummary } from "@compound/contracts";

interface AdminUnitPickerProps {
  helperText?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  units: UnitSummary[];
}

function unitLabel(unit: UnitSummary): string {
  return [
    unit.unitNumber,
    unit.building?.name,
    unit.floor?.label,
    unit.residentName ? `Resident: ${unit.residentName}` : null,
  ].filter(Boolean).join(" · ");
}

function unitMatches(unit: UnitSummary, query: string): boolean {
  const haystack = [
    unit.unitNumber,
    unit.building?.name ?? "",
    unit.floor?.label ?? "",
    unit.residentName ?? "",
  ].join(" ").toLowerCase();

  return haystack.includes(query.trim().toLowerCase());
}

export function AdminUnitPicker({
  helperText,
  label,
  name,
  placeholder = "Search apartment code, building, floor, or resident",
  required = false,
  units,
}: AdminUnitPickerProps) {
  const [query, setQuery] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<UnitSummary | null>(null);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const visibleUnits = useMemo(() => {
    if (selectedUnit) return units.slice(0, 8);
    if (!query.trim()) return units.slice(0, 8);

    return units.filter((unit) => unitMatches(unit, query)).slice(0, 8);
  }, [query, selectedUnit, units]);

  return (
    <div className="relative" ref={wrapperRef}>
      <input name={name} required={required} type="hidden" value={selectedUnit?.id ?? ""} />
      <label className="block text-sm font-semibold text-foreground">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
        <input
          aria-autocomplete="list"
          aria-expanded={open}
          className="mt-2 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedUnit(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          role="combobox"
          value={selectedUnit ? unitLabel(selectedUnit) : query}
        />
      </label>
      {helperText ? <p className="mt-1 text-xs leading-5 text-muted">{helperText}</p> : null}
      {open ? (
        <div
          className="absolute z-[120] mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-line bg-panel p-1 shadow-xl"
          role="listbox"
        >
          {visibleUnits.length > 0 ? (
            visibleUnits.map((unit) => (
              <button
                className="flex min-h-12 w-full flex-col items-start rounded-md px-3 py-2 text-start transition hover:bg-background focus:bg-background focus:outline-none"
                key={unit.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setSelectedUnit(unit);
                  setQuery(unitLabel(unit));
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                <span className="text-sm font-semibold text-foreground">{unit.unitNumber}</span>
                <span className="text-xs text-muted">{unitLabel(unit)}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-3 text-sm text-muted">No apartments found.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
