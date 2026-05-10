import { getCurrentUser } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";
import { AdminShell } from "@/components/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminUser(getCurrentUser);

  return <AdminShell user={user}>{children}</AdminShell>;
}
