import { getCurrentUser } from "@/lib/api";
import { getCompoundContext, requireAdminUser } from "@/lib/session";

import { OrgChartRedirectClient } from "./org-chart-redirect-client";

export default async function Page() {
  const user = await requireAdminUser(getCurrentUser);
  const compoundId = (await getCompoundContext()) ?? user.compoundId;

  const targetHref = compoundId ? `/compounds/${compoundId}/org-chart` : "/compounds";

  return <OrgChartRedirectClient targetHref={targetHref} />;
}
