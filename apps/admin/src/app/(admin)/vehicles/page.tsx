import { SiteNav } from "@/components/site-nav";
import { getCurrentUser, lookupVehicles } from "@/lib/api";
import { requireAdminUser } from "@/lib/session";
import { VehicleSearchView } from "./vehicle-search-view";
import { Suspense } from "react";

interface VehiclesPageProps {
  searchParams?: Promise<{ q?: string }>;
}

export default async function VehiclesPage({ searchParams }: VehiclesPageProps) {
  await requireAdminUser(getCurrentUser);
  const params = searchParams ? await searchParams : {};
  const query = String(params.q ?? "").trim();
  const initialResults = query.length >= 2 ? await lookupVehicles(query) : [];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteNav breadcrumb={[{ label: "Vehicle Lookup" }]} />
      
      <header className="border-b border-line bg-panel overflow-hidden relative">
        <div className="absolute top-0 end-0 p-8 opacity-5 select-none pointer-events-none">
          <svg className="h-64 w-64" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42.99L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>
        </div>
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <h1 className="text-4xl font-black tracking-tight text-foreground">Vehicle Lookup</h1>
          <p className="mt-2 text-lg text-muted max-w-2xl font-medium">
            Identify vehicles across the compound. Verify residents and visitors instantly to resolve security or parking incidents.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <Suspense fallback={<div className="h-32 w-full bg-panel rounded-3xl animate-pulse" />}>
          <VehicleSearchView initialResults={initialResults} />
        </Suspense>
      </section>
    </main>
  );
}
