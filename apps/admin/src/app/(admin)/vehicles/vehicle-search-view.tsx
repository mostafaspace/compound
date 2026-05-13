"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { VehicleLookupResult } from "@/lib/api-types";
import { lookupVehiclesAction, notifyVehicleOwnerAction } from "./actions";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";

interface VehicleSearchViewProps {
  initialResults?: VehicleLookupResult[];
}

export function VehicleSearchView({ initialResults = [] }: VehicleSearchViewProps) {
  const t = useTranslations("Vehicles");
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";
  const { success, error: toastError } = useToast();
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<VehicleLookupResult[]>(initialResults);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [notifyingVehicleId, setNotifyingVehicleId] = useState<number | string | null>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const searchIdRef = useRef(0);

  const performSearch = async (q: string) => {
    const trimmedQuery = q.trim();
    const searchId = searchIdRef.current + 1;
    searchIdRef.current = searchId;
    setSearchError(null);

    if (!trimmedQuery || trimmedQuery.length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await lookupVehiclesAction(trimmedQuery);
      if (searchIdRef.current === searchId) {
        setResults(data);
      }
    } catch (err) {
      if (searchIdRef.current === searchId) {
        setResults([]);
        setSearchError(t("searchFailed"));
      }
    } finally {
      if (searchIdRef.current === searchId) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    setQuery(initialQuery);
    setResults(initialResults);
  }, [initialQuery, initialResults]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const submittedQuery = String(formData.get("q") ?? query);
    const trimmedQuery = submittedQuery.trim();
    setQuery(submittedQuery);

    if (trimmedQuery.length < 2) {
      router.push("/vehicles");
      performSearch(trimmedQuery);
      return;
    }

    router.push(`/vehicles?q=${encodeURIComponent(trimmedQuery)}`);
  };

  const handleNotify = async (vehicleId: number | string) => {
    if (!message.trim()) {
      toastError(t("enterMessage"));
      return;
    }
    setIsSending(true);
    try {
      const res = await notifyVehicleOwnerAction(vehicleId, message);
      if ("error" in res) {
        toastError(res.error);
      } else {
        success(t("notifSent", { count: res.recipientCount }));
        setNotifyingVehicleId(null);
        setMessage("");
      }
    } catch (err) {
      toastError(t("notifFailed"));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none text-muted group-focus-within:text-brand transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          name="q"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onInput={(e) => setQuery(e.currentTarget.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full h-14 ps-12 pe-28 rounded-2xl border border-line bg-panel text-lg font-medium shadow-sm focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none transition-all"
          autoFocus
        />
        <div className="absolute inset-y-0 end-0 pe-2 flex items-center gap-2">
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-brand border-t-transparent"></div>
          ) : null}
          <button
            className={`inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-bold text-white shadow-sm transition hover:bg-brand-strong ${
              isLoading || query.trim().length < 2 ? "opacity-50" : ""
            }`}
            type="submit"
          >
            {t("searchButton")}
          </button>
        </div>
      </form>

      {searchError ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm font-semibold text-danger">
          {searchError}
        </div>
      ) : null}

      <div className="grid gap-6">
        {results.length === 0 && !isLoading && query.length >= 2 && (
          <div className="p-12 text-center border-2 border-dashed border-line rounded-3xl text-muted">
            {t("noResults", { query })}
          </div>
        )}

        {results.map((result, idx) => (
          <div 
            key={`${result.source}-${result.vehicleId}-${idx}`} 
            className="group overflow-hidden rounded-3xl border border-line bg-panel hover:border-brand hover:shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex flex-col md:flex-row">
              <div className="p-6 md:w-1/3 bg-panel-strong border-b md:border-b-0 md:border-e border-line flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${result.source === 'apartment_vehicle' ? 'bg-brand/10 text-brand' : 'bg-warning/10 text-warning'}`}>
                      {result.source === 'apartment_vehicle' ? t("residentVehicle") : t("visitorRequest")}
                    </span>
                  </div>
                  <h3 className="text-3xl font-black text-foreground tracking-tight">{result.plate}</h3>
                  <p className="mt-1 text-sm text-muted font-medium">
                    {[result.color, result.make, result.model].filter(Boolean).join(" ")}
                  </p>
                  {result.stickerCode && (
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-background border border-line rounded-xl shadow-inner">
                      <span className="text-[10px] font-bold text-muted uppercase">{t("sticker")}</span>
                      <span className="text-sm font-bold text-foreground">{result.stickerCode}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div className="grid sm:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">{t("associatedUnit")}</h4>
                    {result.unit.id ? (
                      <Link 
                         href={`/units/${result.unit.id}`}
                         className="block p-4 rounded-2xl bg-background border border-line hover:border-brand transition-colors group/unit"
                      >
                        <div className="text-lg font-bold text-foreground group-hover/unit:text-brand transition-colors">
                          {result.unit.buildingName} · {result.unit.unitNumber}
                        </div>
                        <div className="text-xs text-muted font-medium">{t("viewDetails")}</div>
                      </Link>
                    ) : (
                      <div className="p-4 rounded-2xl bg-background border border-line text-sm text-muted italic">
                        {t("noUnitLinked")}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">{t("linkedContacts")}</h4>
                    <div className="space-y-2">
                      {result.residents.map((resident, ridx) => (
                        <div key={ridx} className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-panel-strong border border-line flex items-center justify-center font-bold text-xs text-brand">
                            {resident.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-foreground">{resident.name}</div>
                            <div className="text-xs text-muted">{resident.phone || resident.email || t("noContactInfo")}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {result.source === "apartment_vehicle" ? (
                <div className="mt-8 pt-6 border-t border-line">
                  {notifyingVehicleId === result.vehicleId ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={t("messagePlaceholder")}
                        className="w-full p-4 rounded-2xl border border-line bg-background text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all min-h-[100px]"
                        autoFocus
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleNotify(result.vehicleId)}
                          disabled={isSending || !message.trim()}
                          className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-bold hover:bg-brand-strong disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-brand/20 active:scale-95"
                        >
                          {isSending ? (
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                          )}
                          {t("sendMessage")}
                        </button>
                        <button
                          onClick={() => {
                            setNotifyingVehicleId(null);
                            setMessage("");
                          }}
                          className="px-6 py-2 bg-panel border border-line text-foreground rounded-xl text-sm font-bold hover:bg-panel-strong transition-all active:scale-95"
                        >
                          {t("cancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setNotifyingVehicleId(result.vehicleId)}
                      className="flex items-center gap-2 px-4 py-2 bg-brand/5 text-brand rounded-xl text-sm font-bold hover:bg-brand/10 transition-all group/btn"
                    >
                      <svg className="w-4 h-4 group-hover/btn:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      {t("notifyOwner")}
                    </button>
                  )}
                </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
