"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { normalizeDigits } from "@/lib/numerals";

interface AdminSearchItem {
  href: string;
  label: string;
  group: string;
  keywords: string[];
}

interface AdminGlobalSearchProps {
  items: AdminSearchItem[];
  placeholder: string;
  fallbackLabel: string;
  noResultsLabel: string;
}

function normalize(value: string): string {
  return normalizeDigits(value).trim().toLowerCase();
}

export function AdminGlobalSearch({
  items,
  placeholder,
  fallbackLabel,
  noResultsLabel,
}: AdminGlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const normalizedQuery = normalize(query);

  const matches = useMemo(() => {
    if (!normalizedQuery) return items.slice(0, 8);

    return items
      .map((item) => {
        const haystack = normalize([item.label, item.group, ...item.keywords].join(" "));
        const label = normalize(item.label);
        const score = label === normalizedQuery ? 0 : label.startsWith(normalizedQuery) ? 1 : haystack.includes(normalizedQuery) ? 2 : 9;

        return { item, score };
      })
      .filter((match) => match.score < 9)
      .sort((a, b) => a.score - b.score || a.item.label.localeCompare(b.item.label))
      .slice(0, 8)
      .map((match) => match.item);
  }, [items, normalizedQuery]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (matches[0]) {
      window.location.assign(matches[0].href);
      return;
    }

    const params = new URLSearchParams();
    if (normalizedQuery) params.set("q", normalizeDigits(query).trim());
    window.location.assign(`/vehicles${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <form className="relative min-w-0 flex-1" onSubmit={handleSubmit}>
      <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        className="h-10 w-full rounded-xl border border-line bg-background px-10 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        value={query}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        name="admin-search"
        autoComplete="off"
      />
      {isOpen && (
        <div className="absolute start-0 end-0 top-12 z-50 overflow-hidden rounded-xl border border-line bg-panel shadow-premium-lg">
          {matches.length > 0 ? (
            <ul className="max-h-[360px] overflow-y-auto py-1">
              {matches.map((item) => (
                <li key={item.href}>
                  <Link
                    className="block px-4 py-3 text-sm transition hover:bg-background focus:bg-background focus:outline-none"
                    href={item.href}
                  >
                    <span className="block font-semibold text-foreground">{item.label}</span>
                    <span className="mt-0.5 block text-xs text-muted">{item.group}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{noResultsLabel}</p>
              <button className="mt-2 text-sm font-semibold text-brand hover:text-brand-strong" type="submit">
                {fallbackLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
