"use client";

import type { ContactVisibility, RepresentativeAssignment } from "@/lib/orgchart";
import { expireRepresentativeAssignment, updateRepresentativeAssignment } from "@/lib/orgchart-actions";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CONTACT_VISIBILITY } from "./representative-assignment-form";

interface EditAssignmentFormProps {
  assignment: RepresentativeAssignment;
}

export function EditAssignmentForm({ assignment }: EditAssignmentFormProps) {
  const [contactVisibility, setContactVisibility] = useState(assignment.contactVisibility);
  const [notes, setNotes] = useState(assignment.notes ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isExpiring, setIsExpiring] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await updateRepresentativeAssignment(assignment.id, {
        contactVisibility,
        notes: notes.trim() || undefined,
      });
      router.push(`/compounds/${assignment.compoundId}/representatives`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  const handleExpire = async () => {
    if (!confirm("Are you sure you want to expire this assignment? This cannot be undone.")) return;

    setError("");
    setIsExpiring(true);

    try {
      await expireRepresentativeAssignment(assignment.id);
      router.push(`/compounds/${assignment.compoundId}/representatives`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsExpiring(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="mb-4 text-lg font-semibold">Assignment Details</h2>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Name</p>
              <p className="mt-1 text-foreground">{assignment.user?.name ?? "Unknown"}</p>
            </div>

            <div>
              <p className="text-sm font-medium">Role</p>
              <p className="mt-1 text-foreground">
                {assignment.role
                  .split("_")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium">Starts at</p>
              <p className="mt-1 font-mono text-sm text-foreground">{assignment.startsAt}</p>
            </div>

            {assignment.endsAt && (
              <div>
                <p className="text-sm font-medium">Ended at</p>
                <p className="mt-1 font-mono text-sm text-foreground">{assignment.endsAt}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="mb-4 text-lg font-semibold">Contact Settings</h2>

          <div className="space-y-4">
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
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>

      {assignment.isActive && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-5">
          <h2 className="text-lg font-semibold text-red-700">Expire Assignment</h2>
          <p className="mt-2 text-sm text-red-600">End this assignment immediately. This cannot be undone.</p>
          <button
            onClick={handleExpire}
            disabled={isExpiring}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-lg border border-red-300 bg-transparent px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
          >
            {isExpiring ? "Expiring..." : "Expire assignment"}
          </button>
        </div>
      )}
    </div>
  );
}
