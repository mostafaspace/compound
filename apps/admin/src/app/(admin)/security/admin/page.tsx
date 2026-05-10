import { getTranslations } from "next-intl/server";
import { SiteNav } from "@/components/site-nav";
import { getCurrentUser } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";
import { SecurityDashboard } from "../security-dashboard";

export default async function AdminSecurityPage() {
  await requireAdminUser(getCurrentUser, ["super_admin", "compound_admin"]);
  const t = await getTranslations("Security");
  
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[
        { label: t("title"), href: "/security" },
        { label: t("adminAuditTitle") }
      ]} />
      
      <header className="border-b border-line bg-panel">
        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("adminAuditTitle")}</h1>
            <p className="mt-2 text-muted max-w-2xl">
              {t("adminAuditSubtitle")}
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <SecurityDashboard />
      </section>
    </main>
  );
}
