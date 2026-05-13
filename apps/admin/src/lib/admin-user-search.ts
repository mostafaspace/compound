"use server";

import { getUsersPage } from "@/lib/api";
import { toAdminUserOption, type AdminUserOption } from "@/lib/admin-user-options";

export async function searchAdminUsers(
  query: string,
  options: { excludeUserId?: number; status?: string } = {},
): Promise<AdminUserOption[]> {
  const trimmed = query.trim();
  const page = await getUsersPage({
    page: 1,
    perPage: 20,
    q: trimmed.length > 0 ? trimmed : undefined,
    status: options.status,
  });

  return (page.data ?? [])
    .filter((user) => user.id !== options.excludeUserId)
    .map(toAdminUserOption);
}
