import { Link, useSearchParams } from "react-router-dom";
import { MapPin, Search, Store } from "lucide-react";
import { CATEGORIES, categoryInfo } from "@/lib/categories";
import { useDiscover } from "@/hooks/queries";
import { EmptyState, ErrorState, Loading, SampleBadge } from "@/components/common/States";
import { cn, errorMessage } from "@/lib/utils";
import type { Category } from "@/types";

export default function DiscoverPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("category");
  const category: Category | "ALL" = CATEGORIES.some((c) => c.value === raw) ? (raw as Category) : "ALL";
  const q = params.get("q") ?? "";
  const res = useDiscover(category, q);
  const set = (next: Record<string, string>) => { const p = new URLSearchParams(params); Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k))); setParams(p, { replace: true }); };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-bold">Browse local businesses</h1>
      <p className="mt-2 text-ocean-700">Sample storefronts that show what CoastShield businesses look like.</p>
      <div className="relative mt-6 max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ocean-500" aria-hidden /><input aria-label="Search businesses" placeholder="Search by name or town" className="field-input pl-10" value={q} onChange={(e) => set({ q: e.target.value })} /></div>
      <div role="group" aria-label="Filter by category" className="mt-4 flex flex-wrap gap-2">
        {[{ value: "ALL", label: "All" }, ...CATEGORIES].map((c) => <button key={c.value} onClick={() => set({ category: c.value === "ALL" ? "" : c.value })} aria-pressed={category === c.value} className={cn("min-h-[44px] rounded-full border px-4 text-sm font-semibold", category === c.value ? "border-ocean-900 bg-ocean-900 text-white" : "border-ocean-200 bg-white hover:bg-ocean-50")}>{c.label}</button>)}
      </div>
      <div className="mt-8" aria-live="polite">
        {res.isLoading ? <Loading /> : res.isError ? <ErrorState message={errorMessage(res.error)} onRetry={() => res.refetch()} /> : res.data!.length === 0 ? (
          <EmptyState icon={Store} title="No businesses found">Try a different search or category.</EmptyState>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {res.data!.map((b) => { const c = categoryInfo(b.category); return (
              <li key={b.id}><Link to={`/store/${b.slug}`} className="card flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-start justify-between gap-2"><span className={cn("flex h-12 w-12 items-center justify-center rounded-xl", c.tile)}><c.icon className="h-6 w-6" aria-hidden /></span>{b.isSample && <SampleBadge />}</div>
                <h2 className="mt-3 text-xl font-bold">{b.name}</h2>
                <p className="mt-0.5 text-sm font-semibold text-ocean-600">{c.label}</p>
                <p className="mt-2 flex-1 text-ocean-700">{b.description}</p>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-ocean-600"><MapPin className="h-4 w-4" aria-hidden />{b.town}, {b.county}</p>
              </Link></li>
            ); })}
          </ul>
        )}
      </div>
    </div>
  );
}
