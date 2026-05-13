"use client";

import { useState, useEffect } from "react";
import type { 
  AdminSecurityFlag,
  AdminSession
} from "@/lib/api-types";
import { 
  getAdminSecurityFlagsAction, 
  reviewAdminSecurityFlagAction, 
  getAdminSessionsAction 
} from "./actions";

export function SecurityDashboard() {
  const [flags, setFlags] = useState<AdminSecurityFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string } | null>(null);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const fetchFlags = async () => {
    setIsLoading(true);
    try {
      const data = await getAdminSecurityFlagsAction();
      setFlags(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const handleReview = async (flagId: number, status: "reviewed" | "dismissed") => {
    try {
      await reviewAdminSecurityFlagAction(flagId, status);
      fetchFlags();
    } catch (err) {
      alert("Failed to review flag");
    }
  };

  const viewUserAudit = async (user: { id: number; name: string }) => {
    setSelectedUser(user);
    setIsLoadingSessions(true);
    try {
      const data = await getAdminSessionsAction(user.id);
      setSessions(data);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Security Flags</h2>
          <span className="px-2 py-1 bg-danger/10 text-danger text-xs font-bold rounded-full">
            {flags.filter(f => f.status === 'open').length} Open Alerts
          </span>
        </div>
        
        <div className="grid gap-4">
          {isLoading ? (
            <div className="p-12 text-center border border-line rounded-xl bg-panel animate-pulse text-muted">Scanning for anomalies...</div>
          ) : flags.length === 0 ? (
            <div className="p-12 text-center border border-line rounded-xl bg-panel text-muted">No security flags detected. System is secure.</div>
          ) : (
            flags.map((flag) => (
              <div key={flag.id} className={`flex items-start gap-4 p-4 border rounded-xl bg-panel transition-all ${flag.status !== 'open' ? 'opacity-60 grayscale' : 'border-line hover:border-brand shadow-sm'}`}>
                <div className={`p-2 rounded-lg ${flag.severity === 'critical' ? 'bg-danger/10 text-danger' : flag.severity === 'warning' ? 'bg-warning/10 text-warning' : 'bg-brand/10 text-brand'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-foreground">{flag.summary}</h3>
                    <span className="text-xs text-muted">{flag.createdAt ? new Date(flag.createdAt).toLocaleString() : ''}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    Detected for user: <button onClick={() => flag.user && viewUserAudit(flag.user)} className="font-bold text-brand hover:underline">{flag.user?.name}</button> ({flag.user?.email})
                  </p>
                  {flag.status === 'open' && (
                    <div className="mt-4 flex gap-2">
                      <button 
                        onClick={() => handleReview(flag.id, 'reviewed')}
                        className="px-3 py-1.5 bg-brand text-white text-xs font-bold rounded-lg hover:bg-brand-strong transition-colors"
                      >
                        Acknowledge
                      </button>
                      <button 
                        onClick={() => handleReview(flag.id, 'dismissed')}
                        className="px-3 py-1.5 bg-panel border border-line text-foreground text-xs font-bold rounded-lg hover:bg-background transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {selectedUser && (
        <section className="animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-4 border-t border-line pt-8">
            <h2 className="text-xl font-bold text-foreground">Audit Log: {selectedUser.name}</h2>
            <button onClick={() => setSelectedUser(null)} className="text-sm text-brand font-bold hover:underline">Close Audit</button>
          </div>

          <div className="rounded-xl border border-line bg-panel overflow-hidden">
            <table className="w-full text-start text-sm">
              <thead className="bg-background text-muted uppercase text-[10px] font-bold tracking-wider border-b border-line">
                <tr>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Device / User Agent</th>
                  <th className="px-4 py-3">First Seen</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {isLoadingSessions ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted">Retrieving session history...</td></tr>
                ) : sessions.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted">No session history found.</td></tr>
                ) : (
                  sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-background/50 transition-colors">
                      <td className="px-4 py-4 font-mono text-xs">{session.ipAddress}</td>
                      <td className="px-4 py-4 max-w-xs">
                        <div className="font-bold text-foreground">{session.deviceLabel || 'Unknown Device'}</div>
                        <div className="text-[10px] text-muted truncate" title={session.userAgent}>{session.userAgent}</div>
                      </td>
                      <td className="px-4 py-4 text-xs">{session.firstSeenAt ? new Date(session.firstSeenAt).toLocaleString() : ''}</td>
                      <td className="px-4 py-4 text-xs">{session.lastSeenAt ? new Date(session.lastSeenAt).toLocaleString() : ''}</td>
                      <td className="px-4 py-4">
                        {session.revokedAt ? (
                          <span className="px-2 py-0.5 bg-line text-muted text-[10px] font-bold rounded-full uppercase">Revoked</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-success/10 text-success text-[10px] font-bold rounded-full uppercase">Active</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
