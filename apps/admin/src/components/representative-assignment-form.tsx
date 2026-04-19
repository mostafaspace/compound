"use client";

import type {
  ContactVisibility,
  CreateRepresentativeAssignmentInput,
  RepresentativeAssignment,
  RepresentativeRole,
} from "@/lib/orgchart";
import { useState } from "react";

export const REPRESENTATIVE_ROLES = [
  { value: "floor_representative", label: "Floor Representative" },
  { value: "building_representative", label: "Building Representative" },
  { value: "association_member", label: "Association Member" },
  { value: "president", label: "President" },
  { value: "treasurer", label: "Treasurer" },
  { value: "security_contact", label: "Security Contact" },
  { value: "admin_contact", label: "Admin Contact" },
] as const;

export const CONTACT_VISIBILITY = [
  { value: "all_residents", label: "All Residents" },
  { value: "building_residents", label: "Building Residents" },
  { value: "floor_residents", label: "Floor Residents" },
  { value: "admins_only", label: "Admins Only" },
] as const;

interface RepresentativeAssignmentFormProps {
  users?: Array<{ id: number; name: string }>;
  buildings?: Array<{ id: string; name: string }>;
  floors?: Array<{ id: string; name: string }>;
  initialData?: RepresentativeAssignment;
  onSubmit: (data: CreateRepresentativeAssignmentInput) => Promise<void>;
  isLoading?: boolean;
}

export function RepresentativeAssignmentForm({
  users = [],
  buildings = [],
  floors = [],
  initialData,
  onSubmit,
  isLoading = false,
}: RepresentativeAssignmentFormProps) {
  const [userId, setUserId] = useState<number | "">(initialData?.userId ?? "");
  const [role, setRole] = useState<RepresentativeRole | "">(initialData?.role ?? "");
  const [buildingId, setBuildingId] = useState<string>(initialData?.buildingId ?? "");
  const [floorId, setFloorId] = useState<string>(initialData?.floorId ?? "");
  const [startsAt, setStartsAt] = useState<string>(initialData?.startsAt ?? new Date().toISOString().split("T")[0]);
  const [contactVisibility, setContactVisibility] = useState<ContactVisibility>(initialData?.contactVisibility ?? "all_residents");
  const [notes, setNotes] = useState<string>(initialData?.notes ?? "");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const roleRequiresBuilding = (selectedRole: string): boolean => {
    return ["building_representative"].includes(selectedRole);
  };

  const roleRequiresFloor = (selectedRole: string): boolean => {
    return ["floor_representative"].includes(selectedRole);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (!userId || !role || !startsAt) {
        throw new Error("Please fill in all required fields");
      }

      if (roleRequiresBuilding(role) && !buildingId) {
        throw new Error(`${REPRESENTATIVE_ROLES.find((r) => r.value === role)?.label} role requires a building`);
      }

      if (roleRequiresFloor(role) && !floorId) {
        throw new Error(`${REPRESENTATIVE_ROLES.find((r) => r.value === role)?.label} role requires a floor`);
      }

      const input: CreateRepresentativeAssignmentInput = {
        userId: Number(userId),
        role: role as RepresentativeRole,
        startsAt,
        contactVisibility,
        notes: notes.trim() || undefined,
      };

      if (buildingId) input.buildingId = buildingId;
      if (floorId) input.floorId = floorId;

      await onSubmit(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="userId" className="block text-sm font-medium">
          Representative <span className="text-red-500">*</span>
        </label>
        <select
          id="userId"
          required
          value={userId}
          onChange={(e) => setUserId(e.target.value ? Number(e.target.value) : "")}
          className="mt-2 w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
        >
          <option value="">Select a user</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium">
          Role <span className="text-red-500">*</span>
        </label>
        <select
          id="role"
          required
          value={role}
          onChange={(e) => setRole(e.target.value as RepresentativeRole)}
          className="mt-2 w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
        >
          <option value="">Select a role</option>
          {REPRESENTATIVE_ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {roleRequiresBuilding(role as string) && (
        <div>
          <label htmlFor="buildingId" className="block text-sm font-medium">
            Building <span className="text-red-500">*</span>
          </label>
          <select
            id="buildingId"
            required={roleRequiresBuilding(role as string)}
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
            className="mt-2 w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
          >
            <option value="">Select a building</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {roleRequiresFloor(role as string) && (
        <div>
          <label htmlFor="floorId" className="block text-sm font-medium">
            Floor <span className="text-red-500">*</span>
          </label>
          <select
            id="floorId"
            required={roleRequiresFloor(role as string)}
            value={floorId}
            onChange={(e) => setFloorId(e.target.value)}
            className="mt-2 w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
          >
            <option value="">Select a floor</option>
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="startsAt" className="block text-sm font-medium">
          Starts at <span className="text-red-500">*</span>
        </label>
        <input
          id="startsAt"
          type="date"
          required
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className="mt-2 w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="contactVisibility" className="block text-sm font-medium">
          Contact Visibility
        </label>
        <select
          id="contactVisibility"
          value={contactVisibility}
          onChange={(e) => setContactVisibility(e.target.value as ContactVisibility)}
          className="mt-2 w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
        >
          {CONTACT_VISIBILITY.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any additional notes..."
          className="mt-2 w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
          rows={3}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting || isLoading}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save assignment"}
        </button>
      </div>
    </form>
  );
}
