import { useRef, useState, type KeyboardEvent } from "react";
import { Minus, Plus, RotateCcw, ShieldAlert, ShoppingBag, Store } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/States";
import { StatusBadge, StatusStepper } from "@/components/orders/StatusBadge";
import { AnalysisResultPanel } from "@/components/security/AnalysisResultPanel";
import { analyzeMessage } from "@/services/security/analyzer";
import { SAMPLE_MESSAGES } from "@/services/security/samples";
import { TRANSITIONS, STATUS_ACTION } from "@/lib/orderRules";
import { cn, formatKes } from "@/lib/utils";
import type { OrderStatus } from "@/types";

const PRODUCTS = [
  { id: "t", name: "Fresh tilapia (per kg)", price: 450 },
  { id: "p", name: "Prawns (per kg)", price: 1400 },
  { id: "o", name: "Octopus (per kg)", price: 700 },
];
const TABS = [{ id: "store", label: "Storefront", icon: Store }, { id: "order", label: "Order", icon: ShoppingBag }, { id: "security", label: "Security check", icon: ShieldAlert }] as const;
type Tab = (typeof TABS)[number]["id"];
const PREVIEW_MSGS = ["account-link", "customer-claim", "fake-reversal"];

export function ProductPreview() {
  const [tab, setTab] = useState<Tab>("store");
  const [cart, setCart] = useState<Record<string, number>>({ t: 2 });
  const [status, setStatus] = useState<OrderStatus>("NEW");
  const [msgId, setMsgId] = useState(PREVIEW_MSGS[0]);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const lines = PRODUCTS.filter((p) => cart[p.id]);
  const total = lines.reduce((s, p) => s + p.price * cart[p.id], 0);
  const msg = SAMPLE_MESSAGES.find((m) => m.id === msgId)!;
  const nextStatus = TRANSITIONS[status].find((s) => s !== "CANCELLED");

  const onKey = (e: KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const n = e.key === "ArrowRight" ? (i + 1) % TABS.length : e.key === "ArrowLeft" ? (i + TABS.length - 1) % TABS.length : -1;
    if (n >= 0) { e.preventDefault(); setTab(TABS[n].id); refs.current[TABS[n].id]?.focus(); }
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-sand-200 bg-sand-50 px-4 py-3">
        <div role="tablist" aria-label="Product preview" className="flex gap-1" onKeyDown={onKey}>
          {TABS.map((t) => (
            <button key={t.id} ref={(el) => { refs.current[t.id] = el; }} role="tab" aria-label={t.label} id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} tabIndex={tab === t.id ? 0 : -1} onClick={() => setTab(t.id)}
              className={cn("flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-sm font-semibold", tab === t.id ? "bg-ocean-900 text-white" : "text-ocean-700 hover:bg-ocean-100")}>
              <t.icon className="h-4 w-4" aria-hidden /><span className={tab === t.id ? "" : "hidden sm:inline"}>{t.label}</span>
            </button>
          ))}
        </div>
        <Badge tone="amber">Sample data</Badge>
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="p-5">
        {tab === "store" && (
          <div>
            <h3 className="text-lg font-bold">Mama Fatuma's Fresh Catch</h3>
            <p className="text-sm text-ocean-600">Try adding items, just as a customer would.</p>
            <ul className="mt-4 space-y-2">
              {PRODUCTS.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-sand-200 p-3">
                  <div><p className="font-semibold">{p.name}</p><p className="text-sm font-bold text-lagoon-800">{formatKes(p.price)}</p></div>
                  {cart[p.id] ? (
                    <div className="flex items-center gap-1">
                      <button className="flex h-10 w-10 items-center justify-center rounded-full border border-ocean-200" onClick={() => setCart((c) => ({ ...c, [p.id]: c[p.id] - 1 }))} aria-label={`Remove one ${p.name}`}><Minus className="h-4 w-4" /></button>
                      <span className="w-6 text-center font-bold">{cart[p.id]}</span>
                      <button className="flex h-10 w-10 items-center justify-center rounded-full bg-lagoon-700 text-white" onClick={() => setCart((c) => ({ ...c, [p.id]: c[p.id] + 1 }))} aria-label={`Add one more ${p.name}`}><Plus className="h-4 w-4" /></button>
                    </div>
                  ) : <Button size="sm" onClick={() => setCart((c) => ({ ...c, [p.id]: 1 }))}><Plus className="h-4 w-4" />Add</Button>}
                </li>
              ))}
            </ul>
            <Button className="mt-4" onClick={() => setTab("order")} disabled={lines.length === 0}>See it as an order request →</Button>
          </div>
        )}
        {tab === "order" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold">Order request</h3><StatusBadge status={status} /></div>
            <p className="text-sm text-ocean-600">The owner sees requests and moves them forward. Try it.</p>
            <ul className="mt-3 divide-y divide-sand-200 rounded-xl border border-sand-200 text-sm">
              {(lines.length ? lines : [PRODUCTS[0]]).map((p) => <li key={p.id} className="flex justify-between px-3 py-2"><span>{cart[p.id] || 1} × {p.name}</span><span>{formatKes(p.price * (cart[p.id] || 1))}</span></li>)}
              <li className="flex justify-between px-3 py-2 font-bold"><span>Estimated total</span><span>{formatKes(lines.length ? total : 450)}</span></li>
            </ul>
            <div className="mt-4"><StatusStepper status={status} /></div>
            <div className="mt-4 flex flex-wrap gap-2">
              {nextStatus && <Button onClick={() => setStatus(nextStatus)}>{STATUS_ACTION[nextStatus]}</Button>}
              {status !== "NEW" && <Button variant="secondary" onClick={() => setStatus("NEW")}><RotateCcw className="h-4 w-4" />Start again</Button>}
            </div>
            <p className="mt-3 text-xs text-ocean-600">Payment is recorded by the owner. CoastShield never treats a message or screenshot as proof of payment.</p>
          </div>
        )}
        {tab === "security" && (
          <div>
            <h3 className="text-lg font-bold">Check a suspicious message</h3>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Sample messages">
              {PREVIEW_MSGS.map((id) => { const m = SAMPLE_MESSAGES.find((x) => x.id === id)!; return <button key={id} onClick={() => setMsgId(id)} aria-pressed={msgId === id} className={cn("min-h-[40px] rounded-full border px-3 text-sm font-semibold", msgId === id ? "border-ocean-900 bg-ocean-900 text-white" : "border-ocean-200 hover:bg-ocean-50")}>{m.label}</button>; })}
            </div>
            <blockquote className="mt-3 rounded-xl bg-sand-100 p-3 text-sm text-ocean-800">{msg.text}</blockquote>
            <div className="mt-4"><AnalysisResultPanel result={analyzeMessage(msg.text)} kind="message" /></div>
          </div>
        )}
      </div>
    </div>
  );
}
