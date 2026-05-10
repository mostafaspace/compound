"use client";

import { useState } from "react";
import type { ApartmentPenaltyEvent } from "@/lib/api-types";
import { addPenaltyAction, voidPenaltyAction } from "../actions";

interface PenaltyPointsPanelProps {
  unitId: string;
  initialEvents: ApartmentPenaltyEvent[];
}

export function PenaltyPointsPanel({ unitId, initialEvents }: PenaltyPointsPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [points, setPoints] = useState(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      await addPenaltyAction(unitId, {
        points,
        reason,
        notes,
        expires_at: expiresAt || undefined,
      });
      setShowModal(false);
      setReason("");
      setNotes("");
      setPoints(1);
    } catch (err) {
      alert("Failed to add penalty points");
    } finally {
      setIsAdding(false);
    }
  };

  const handleVoid = async (eventId: number) => {
    const voidReason = prompt("Please provide a reason for voiding these points:");
    if (!voidReason) return;

    try {
      await voidPenaltyAction(unitId, eventId, voidReason);
    } catch (err) {
      alert("Failed to void penalty point");
    }
  };

  const activePoints = initialEvents
    .filter(e => !e.voidedAt && (!e.expiresAt || new Date(e.expiresAt) > new Date()))
    .reduce((sum, e) => sum + e.points, 0);

  return (
    <section className="rounded-lg border border-line bg-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-panel-strong">
        <div>
          <h3 className="text-base font-semibold">Penalty Points</h3>
          <p className="text-xs text-muted">Tracking rule violations for this apartment.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className={`text-xl font-bold ${activePoints > 5 ? 'text-danger' : activePoints > 0 ? 'text-warning' : 'text-success'}`}>
              {activePoints}
            </span>
            <span className="ml-1 text-xs text-muted uppercase font-bold">Active Points</span>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-strong transition-colors"
          >
            Add Penalty
          </button>
        </div>
      </div>

      <div className="divide-y divide-line">
        {initialEvents.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">No penalty history recorded for this unit.</div>
        ) : (
          initialEvents.map((event) => (
            <div key={event.id} className={`px-4 py-3 flex items-center justify-between ${event.voidedAt ? 'opacity-50 grayscale bg-background/50' : ''}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${event.voidedAt ? 'bg-line text-muted' : 'bg-danger/10 text-danger'}`}>
                    {event.voidedAt ? 'VOID' : `+${event.points}`}
                  </span>
                  <span className="font-medium text-sm text-foreground">{event.reason}</span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                  <span>{event.createdAt ? new Date(event.createdAt).toLocaleDateString() : ''}</span>
                  {event.expiresAt && !event.voidedAt && (
                    <span className="text-warning">Expires: {new Date(event.expiresAt).toLocaleDateString()}</span>
                  )}
                  {event.voidedAt && (
                    <span className="italic">Voided: {event.voidReason}</span>
                  )}
                </div>
                {event.notes && <p className="mt-1.5 text-xs text-muted italic line-clamp-1">"{event.notes}"</p>}
              </div>
              {!event.voidedAt && (
                <button 
                  onClick={() => handleVoid(event.id)}
                  className="p-2 text-muted hover:text-danger transition-colors"
                  title="Void points"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-panel p-6 shadow-2xl border border-line animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Add Penalty Points</h2>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-foreground">Points</label>
                <input 
                  type="number" 
                  min="1" 
                  max="100"
                  required
                  value={points}
                  onChange={e => setPoints(parseInt(e.target.value))}
                  className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-foreground">Reason</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Excessive noise after 11 PM"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-foreground">Notes (Optional)</label>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Additional context..."
                  className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all min-h-[80px]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-foreground">Expiry Date (Optional)</label>
                <input 
                  type="date" 
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                />
                <p className="mt-1 text-[10px] text-muted uppercase font-bold">Points will automatically expire after this date.</p>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-line bg-panel py-2.5 text-sm font-semibold text-foreground hover:bg-background transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isAdding}
                  className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-50 transition-all"
                >
                  {isAdding ? 'Adding...' : 'Apply Penalty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
