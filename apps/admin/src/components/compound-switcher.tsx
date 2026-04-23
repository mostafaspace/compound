"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchCompoundAction } from "@/app/compounds/actions";

interface CompoundOption {
  id: string;
  name: string;
}

interface Props {
  activeCompoundId: string | null;
  compounds?: CompoundOption[];
}

/**
 * Client component: a select that lets a super-admin switch the active compound context.
 * The options are server-fetched and passed in as a prop.
 */
export function CompoundSwitcher({ activeCompoundId, compounds = [] }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    startTransition(async () => {
      await switchCompoundAction(value || null);
      router.refresh();
    });
  }

  return (
    <select
      aria-label="Switch compound"
      className="h-8 rounded-lg border border-[#e7d7a9] bg-[#fff8e8] px-3 text-xs font-semibold text-[#7a5d1a] disabled:opacity-50"
      disabled={isPending}
      onChange={handleChange}
      value={activeCompoundId ?? ""}
    >
      <option value="">All compounds</option>
      {compounds.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
