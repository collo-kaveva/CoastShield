import { useState } from "react";
import { Link } from "react-router-dom";
import { Info } from "lucide-react";
import { useIncidents } from "@/hooks/queries";
import { Breadcrumbs, ErrorState, Loading, PageHeader } from "@/components/common/States";
import { cn, errorMessage } from "@/lib/utils";

export default function IncidentsPage() {
  const q = useIncidents();
  const [sel, setSel] = useState<string | null>(null);
  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const guide = q.data.find((g) => g.id === sel) ?? q.data[0];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Security centre", to: "/security" }, { label: "Incident guides" }]} />
      <PageHeader title="What to do if something goes wrong" subtitle="Choose what happened. Take one step at a time." />
      <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
        <nav aria-label="Incident types"><ul className="space-y-2">
          {q.data.map((g) => <li key={g.id}><button onClick={() => setSel(g.id)} aria-current={g.id === guide.id ? "true" : undefined} className={cn("min-h-[48px] w-full rounded-xl border-2 px-4 py-2 text-left font-semibold", g.id === guide.id ? "border-lagoon-700 bg-lagoon-50" : "border-ocean-100 bg-white hover:border-ocean-300")}>{g.title}</button></li>)}
        </ul></nav>
        <article className="card p-6" aria-live="polite">
          <h2 className="text-2xl font-bold">{guide.title}</h2>
          <p className="mt-1 text-ocean-600">{guide.summary}</p>
          <ol className="mt-5 space-y-4">
            {guide.steps.map((s, i) => (
              <li key={s.title} className="flex gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ocean-900 text-sm font-bold text-white">{i + 1}</span><div><p className="font-bold">{s.title}</p><p className="text-ocean-700">{s.detail}</p></div></li>
            ))}
          </ol>
          <p className="mt-6 flex gap-2 rounded-xl bg-ocean-50 p-4 text-sm text-ocean-800"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>CoastShield is not an official reporting channel. Contact your mobile-money provider, bank or the platform through their official app, website or the number on your SIM pack or card. Phone numbers change, so we do not list them here, and you should never use numbers from a suspicious message.</span></p>
          <p className="mt-4 text-sm text-ocean-600">Not sure about a message? <Link to="/security" className="font-semibold text-lagoon-800 underline">Check it in the security assistant</Link>.</p>
        </article>
      </div>
    </div>
  );
}
