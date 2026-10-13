import { AlertOctagon, AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import type { AnalysisResult, RiskLevel, Severity } from "@/types";
import { cn } from "@/lib/utils";

const RISK: Record<RiskLevel, { label: string; cls: string; icon: typeof Info; heading: string }> = {
  LOW: { label: "LOW", cls: "border-emerald-300 bg-emerald-50 text-emerald-900", icon: CheckCircle2, heading: "Low warning level" },
  CAUTION: { label: "CAUTION", cls: "border-sun-500 bg-sun-50 text-sun-700", icon: AlertTriangle, heading: "Proceed with caution" },
  HIGH: { label: "HIGH", cls: "border-coral-500 bg-coral-50 text-coral-700", icon: AlertOctagon, heading: "High warning level" },
};
const SEV: Record<Severity, string> = { low: "bg-ocean-100 text-ocean-800", medium: "bg-sun-100 text-sun-700", high: "bg-coral-100 text-coral-700" };

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const r = RISK[risk];
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold", r.cls)}><r.icon className="h-4 w-4" aria-hidden />{r.label}</span>;
}

export function AnalysisResultPanel({ result, kind }: { result: AnalysisResult; kind: "message" | "link" }) {
  const r = RISK[result.risk];
  return (
    <section aria-label="Analysis result" className="card overflow-hidden">
      <div className={cn("flex items-start gap-3 border-b px-5 py-4", r.cls)}>
        <r.icon className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
        <div>
          <p className="text-lg font-bold">{r.heading}</p>
          <p className="mt-0.5 text-sm">{result.summary}</p>
        </div>
      </div>
      <div className="space-y-6 p-5">
        <p className="flex items-start gap-2 rounded-xl bg-ocean-50 px-4 py-3 text-sm text-ocean-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span><strong>Automated warning signs, not confirmed findings.</strong> CoastShield only looked at the text you gave it. It did not contact the sender or open any {kind === "link" ? "website" : "link"}.</span>
        </p>
        <div>
          <h3 className="text-base font-bold">Warning signs found ({result.indicators.length})</h3>
          {result.indicators.length === 0 ? (
            <p className="mt-2 text-ocean-600">None of our checks matched. That is reassuring but not a guarantee.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {result.indicators.map((i, idx) => (
                <li key={`${i.id}-${idx}`} className="rounded-xl border border-sand-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{i.label}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", SEV[i.severity])}>{i.severity} signal</span>
                    <span className="text-xs text-ocean-600">Automated indicator</span>
                  </div>
                  <p className="mt-1.5 text-ocean-700">{i.explanation}</p>
                  {i.matched && <p className="mt-2 break-words rounded-lg bg-sand-100 px-3 py-1.5 font-mono text-xs text-ocean-800">Matched: {i.matched}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold"><ShieldAlert className="h-5 w-5 text-lagoon-700" aria-hidden />Safer next steps</h3>
          <ul className="mt-3 space-y-2">
            {result.recommendations.map((t) => (
              <li key={t} className="flex gap-2 text-ocean-800"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-lagoon-700" aria-hidden />{t}</li>
            ))}
          </ul>
        </div>
        <p className="border-t border-sand-200 pt-4 text-sm text-ocean-600">{result.disclaimer}</p>
      </div>
    </section>
  );
}
