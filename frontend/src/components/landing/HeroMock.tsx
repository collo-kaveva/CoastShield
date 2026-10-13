import { ShieldAlert } from "lucide-react";
import { analyzeMessage } from "@/services/security/analyzer";
import { SAMPLE_MESSAGES } from "@/services/security/samples";
import { RiskBadge } from "@/components/security/AnalysisResultPanel";
import { formatKes } from "@/lib/utils";

/** Decorative illustration. The security card uses the real analyzer on a fictional sample message. */
export function HeroMock() {
  const result = analyzeMessage(SAMPLE_MESSAGES.find((m) => m.id === "account-link")!.text);
  return (
    <div className="relative mx-auto w-full max-w-sm" role="img" aria-label="Illustration: a fish trader's storefront on a phone with a security warning about a suspicious message">
      <div className="rounded-[2rem] border-8 border-ocean-900 bg-white shadow-lift">
        <div className="rounded-t-[1.4rem] bg-ocean-800 px-5 pb-5 pt-6 text-white">
          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">SAMPLE</span>
          <p className="mt-2 font-display text-xl font-bold">Mama Fatuma's Fresh Catch</p>
          <p className="text-xs text-ocean-200">Kongowea Market, Mombasa</p>
        </div>
        <ul className="space-y-2 bg-sand-100 p-4">
          {[["Fresh tilapia (per kg)", 450], ["Prawns (per kg)", 1400], ["Octopus (per kg)", 700]].map(([n, p]) => (
            <li key={n} className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 text-sm shadow-sm">
              <span><span className="block font-semibold">{n}</span><span className="text-xs font-bold text-lagoon-800">{formatKes(p as number)}</span></span>
              <span className="rounded-lg bg-lagoon-700 px-3 py-1 text-xs font-bold text-white">Add</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="absolute -bottom-6 -left-4 w-72 rounded-2xl border border-sand-200 bg-white p-3.5 shadow-lift sm:-left-12">
        <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-sm font-bold"><ShieldAlert className="h-4 w-4 text-coral-600" aria-hidden />Security check</span><RiskBadge risk={result.risk} /></div>
        <p className="mt-1.5 text-xs text-ocean-700">{result.indicators.length} warning signs found, including “{result.indicators[0]?.label}”.</p>
      </div>
    </div>
  );
}
