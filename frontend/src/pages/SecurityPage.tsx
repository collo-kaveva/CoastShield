import { useState } from "react";
import { Link } from "react-router-dom";
import { Link2, ListChecks, LifeBuoy, MessageSquareWarning, ScanSearch, Trash2 } from "lucide-react";
import { useAnalyzeMessage, useAnalyzeUrl, useChecklist, useClearHistory, useHistory } from "@/hooks/queries";
import { Breadcrumbs, PageHeader } from "@/components/common/States";
import { Button } from "@/components/common/Button";
import { TextArea, TextField } from "@/components/common/Fields";
import { AnalysisResultPanel, RiskBadge } from "@/components/security/AnalysisResultPanel";
import { ConfirmDialog } from "@/components/common/Modal";
import { useToast } from "@/app/ToastProvider";
import { timeAgo } from "@/lib/utils";
import { IS_DEMO } from "@/services";
import { SAMPLE_MESSAGES, SAMPLE_URLS } from "@/services/security/samples";
import { MAX_MESSAGE_LENGTH } from "@/services/security/analyzer";
import { cn, errorMessage } from "@/lib/utils";

export default function SecurityPage() {
  const [tab, setTab] = useState<"message" | "link">("message");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const msg = useAnalyzeMessage();
  const link = useAnalyzeUrl();
  const checklist = useChecklist();
  const history = useHistory();
  const clear = useClearHistory();
  const { toast } = useToast();
  const [confirmClear, setConfirmClear] = useState(false);
  const done = (checklist.data ?? []).filter((c) => c.done).length;
  const total = checklist.data?.length ?? 0;

  const runMsg = async () => { setError(null); msg.reset(); try { await msg.mutateAsync(text); } catch (e) { setError(errorMessage(e)); } };
  const runUrl = async () => { setError(null); link.reset(); try { await link.mutateAsync(url); } catch (e) { setError(errorMessage(e)); } };

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Security centre" }]} />
      <PageHeader title="Security centre" subtitle="Practical help to spot scams and protect your business." />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Link to="/security/checklist" className="card flex items-center gap-3 p-4 transition hover:shadow-lift"><ListChecks className="h-6 w-6 text-lagoon-700" aria-hidden /><span><span className="block font-bold">Security checklist</span><span className="text-sm text-ocean-600">{checklist.data ? `${done} of ${total} done` : "Loading…"}</span></span></Link>
        <Link to="/security/incidents" className="card flex items-center gap-3 p-4 transition hover:shadow-lift"><LifeBuoy className="h-6 w-6 text-coral-600" aria-hidden /><span><span className="block font-bold">Something went wrong?</span><span className="text-sm text-ocean-600">Step-by-step incident guides</span></span></Link>
      </div>

      <div role="tablist" aria-label="Security tools" className="mb-4 flex gap-2">
        {([["message", "Check a message", MessageSquareWarning], ["link", "Check a link", Link2]] as const).map(([k, l, I]) => (
          <button key={k} role="tab" id={`t-${k}`} aria-selected={tab === k} aria-controls={`p-${k}`} onClick={() => { setTab(k); setError(null); }} className={cn("flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl font-semibold sm:flex-none sm:px-6", tab === k ? "bg-ocean-900 text-white" : "bg-white text-ocean-700 hover:bg-ocean-50")}><I className="h-4 w-4" aria-hidden />{l}</button>
        ))}
      </div>

      <p className="mb-4 rounded-xl bg-sun-50 px-4 py-3 text-sm text-sun-700"><strong>Never type or paste a PIN, password or one-time code here.</strong> CoastShield will never ask for them. Remove any secret codes from a message before pasting it. {IS_DEMO ? "Your text is checked in your browser and is not saved." : "Your text is sent securely to CoastShield to be checked, then discarded. Only the result (not your text) is kept in your history."}</p>

      {tab === "message" ? (
        <div role="tabpanel" id="p-message" aria-labelledby="t-message" className="space-y-4">
          <div className="card space-y-3 p-5">
            <TextArea label="Paste the suspicious message" className="min-h-[140px]" value={text} maxLength={MAX_MESSAGE_LENGTH} onChange={(e) => setText(e.target.value)} hint={`${text.length}/${MAX_MESSAGE_LENGTH} characters`} error={error ?? undefined} />
            <div><p className="mb-2 text-sm font-semibold text-ocean-700">Or try a sample (fictional) message:</p>
              <div className="flex flex-wrap gap-2">{SAMPLE_MESSAGES.map((s) => <button key={s.id} onClick={() => { setText(s.text); setError(null); msg.reset(); }} className="min-h-[40px] rounded-full border border-ocean-200 bg-white px-3 text-sm font-semibold hover:bg-ocean-50">{s.label}</button>)}</div></div>
            <div className="flex flex-wrap gap-2"><Button onClick={runMsg} loading={msg.isPending}><ScanSearch className="h-4 w-4" aria-hidden />Analyze message</Button>{text && <Button variant="ghost" onClick={() => { setText(""); msg.reset(); setError(null); }}>Clear</Button>}</div>
          </div>
          {msg.isPending && <p role="status" className="text-center text-ocean-600">Checking for warning signs…</p>}
          {msg.data && <AnalysisResultPanel result={msg.data} kind="message" />}
        </div>
      ) : (
        <div role="tabpanel" id="p-link" aria-labelledby="t-link" className="space-y-4">
          <div className="card space-y-3 p-5">
            <TextField label="Web address to check" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") runUrl(); }} error={error ?? undefined} hint="CoastShield only inspects the text of the address. It never opens it." />
            <div><p className="mb-2 text-sm font-semibold text-ocean-700">Try a sample address:</p>
              <div className="flex flex-wrap gap-2">{SAMPLE_URLS.map((s) => <button key={s} onClick={() => { setUrl(s); setError(null); link.reset(); }} className="min-h-[40px] rounded-full border border-ocean-200 bg-white px-3 font-mono text-xs font-semibold hover:bg-ocean-50">{s}</button>)}</div></div>
            <Button onClick={runUrl} loading={link.isPending}><ScanSearch className="h-4 w-4" aria-hidden />Check link</Button>
          </div>
          {link.data && <AnalysisResultPanel result={link.data} kind="link" />}
        </div>
      )}

      <section aria-label="Recent checks" className="card mt-8 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-lg font-bold">Recent checks</h2><p className="text-sm text-ocean-600">Only the outcome is kept. The message or link you checked is never saved.</p></div>
          {(history.data?.length ?? 0) > 0 && <Button size="sm" variant="secondary" onClick={() => setConfirmClear(true)}><Trash2 className="h-4 w-4" aria-hidden />Clear history</Button>}
        </div>
        {history.isLoading ? <p className="mt-3 text-ocean-600">Loading…</p> : (history.data ?? []).length === 0 ? (
          <p className="mt-3 text-ocean-600">No checks yet. Results of messages and links you check will appear here.</p>
        ) : (
          <ul className="mt-3 divide-y divide-sand-200">
            {history.data!.slice(0, 8).map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                <RiskBadge risk={h.risk} />
                <span className="text-sm font-semibold">{h.kind === "MESSAGE" ? "Message" : "Link"}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-ocean-600">{h.indicators.length ? h.indicators.map((i) => i.label).join(", ") : "No warning signs found"}</span>
                <span className="text-xs text-ocean-500">{timeAgo(h.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <ConfirmDialog open={confirmClear} onClose={() => setConfirmClear(false)} loading={clear.isPending} danger title="Clear your check history?" confirmLabel="Clear history"
        message="This removes the list of past check results. It cannot be undone."
        onConfirm={async () => { try { await clear.mutateAsync(); toast("History cleared."); setConfirmClear(false); } catch (e) { toast(errorMessage(e), "error"); } }} />
    </div>
  );
}
