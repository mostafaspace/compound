import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/api";
import { getCompoundContext, requireAdminUser } from "@/lib/session";

export default async function OrgChartRedirectPage() {
  const user = await requireAdminUser(getCurrentUser);
  const compoundId = (await getCompoundContext()) ?? user.compoundId;

  if (!compoundId) {
    redirect("/compounds");
  }

  redirect(`/compounds/${compoundId}/org-chart`);
}
