"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { searchAdminUsers } from "@/lib/admin-user-search";
import type { AdminUserOption } from "@/lib/admin-user-options";

interface AdminUserPickerProps {
  name: string;
  label: string;
  initialUsers: AdminUserOption[];
  defaultUserId?: number | null;
  excludeUserId?: number;
  helperText?: string;
  onUserChange?: (user: AdminUserOption | null) => void;
  placeholder?: string;
  required?: boolean;
  searchStatus?: string;
}

function formatUserLabel(user: AdminUserOption): string {
  return `${user.name} · ${user.email} · #${user.id}`;
}

function userMatches(user: AdminUserOption, query: string): boolean {
  const haystack = [user.name, user.email, user.phone ?? "", String(user.id), user.role, user.status]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.trim().toLowerCase());
}

export function AdminUserPicker({
  name,
  label,
  initialUsers,
  defaultUserId = null,
  excludeUserId,
  helperText,
  onUserChange,
  placeholder = "Search by name, email, phone, or ID",
  required = false,
  searchStatus,
}: AdminUserPickerProps) {
  const initialSelection = useMemo(
    () => initialUsers.find((user) => user.id === defaultUserId) ?? null,
    [defaultUserId, initialUsers],
  );
  const [query, setQuery] = useState(initialSelection ? formatUserLabel(initialSelection) : "");
  const [selectedUser, setSelectedUser] = useState<AdminUserOption | null>(initialSelection);
  const [users, setUsers] = useState<AdminUserOption[]>(initialUsers);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredUsers = useMemo(() => {
    const pool = users.filter((user) => user.id !== excludeUserId);
    if (!query.trim() || selectedUser) return pool.slice(0, 8);
    return pool.filter((user) => userMatches(user, query)).slice(0, 8);
  }, [excludeUserId, query, selectedUser, users]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (selectedUser) return;
    const trimmed = query.trim();
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        const results = await searchAdminUsers(trimmed, {
          excludeUserId,
          status: searchStatus,
        });
        setUsers(results);
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [excludeUserId, query, searchStatus, selectedUser]);

  const pickUser = (user: AdminUserOption) => {
    setSelectedUser(user);
    onUserChange?.(user);
    setQuery(formatUserLabel(user));
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input name={name} type="hidden" value={selectedUser?.id ?? ""} />
      <label className="block text-sm font-semibold text-foreground">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
        <input
          aria-autocomplete="list"
          aria-expanded={open}
          className="mt-2 h-11 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedUser(null);
            onUserChange?.(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          required={required}
          role="combobox"
          value={query}
        />
      </label>
      {helperText ? <p className="mt-1 text-xs leading-5 text-muted">{helperText}</p> : null}
      {selectedUser ? (
        <div className="mt-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs text-muted">
          Selected <span className="font-semibold text-foreground">{selectedUser.name}</span> · ID #{selectedUser.id}
        </div>
      ) : null}
      {open ? (
        <div
          className="absolute z-[120] mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-line bg-panel p-1 shadow-xl"
          role="listbox"
        >
          {isPending ? (
            <div className="px-3 py-3 text-sm text-muted">Searching...</div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <button
                className="flex min-h-12 w-full flex-col items-start rounded-md px-3 py-2 text-start transition hover:bg-background focus:bg-background focus:outline-none"
                key={user.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pickUser(user)}
                role="option"
                type="button"
              >
                <span className="text-sm font-semibold text-foreground">{user.name}</span>
                <span className="text-xs text-muted">
                  {user.email} · #{user.id} · {user.status.replace(/_/g, " ")}
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-3 text-sm text-muted">No users found. Try name, email, phone, or ID.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
