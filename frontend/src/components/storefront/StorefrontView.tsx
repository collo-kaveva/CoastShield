import { useMemo, useState } from "react";
import { Clock, Mail, MapPin, MessageSquareText, Minus, Phone, Plus, ShoppingBag } from "lucide-react";
import type { PublicBusiness, PublicItem } from "@/types";
import { categoryInfo } from "@/lib/categories";
import { summariseHours } from "@/lib/hours";
import { cn, formatKes } from "@/lib/utils";
import { Badge, SampleBadge } from "@/components/common/States";
import { Button } from "@/components/common/Button";
import { OrderRequestDialog } from "./OrderRequestDialog";

interface Props { business: PublicBusiness; items: PublicItem[]; mode: "live" | "preview"; draftNotice?: boolean }

export function StorefrontView({ business, items, mode, draftNotice }: Props) {
  const cat = categoryInfo(business.category);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const live = mode === "live";
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const groups = useMemo(() => {
    const m = new Map<string, PublicItem[]>();
    items.forEach((i) => m.set(i.category || "Items", [...(m.get(i.category || "Items") ?? []), i]));
    return [...m.entries()];
  }, [items]);

  const setQty = (id: string, q: number) => setCart((c) => { const n = { ...c }; if (q <= 0) delete n[id]; else n[id] = Math.min(99, q); return n; });

  return (
    <div className="bg-sand-100 text-ocean-900">
      <header className="relative overflow-hidden bg-ocean-900 px-5 pb-16 pt-10 text-white">
        <svg className="absolute inset-x-0 bottom-0 h-10 w-full text-sand-100" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden>
          <path d="M0 20 Q150 0 300 20 T600 20 T900 20 T1200 20 V40 H0Z" fill="currentColor" />
        </svg>
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="teal"><cat.icon className="h-3.5 w-3.5" aria-hidden />{cat.label}</Badge>
            {business.isSample && <SampleBadge />}
            {draftNotice && <Badge tone="amber">Draft preview: not public</Badge>}
          </div>
          {business.logoUrl && <img src={business.logoUrl} alt={`${business.name} logo`} width={72} height={72} className="mt-4 h-[72px] w-[72px] rounded-2xl bg-white object-cover shadow-card" />}
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{business.name || "Your business name"}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-ocean-100"><MapPin className="h-4 w-4" aria-hidden />{[business.town, business.county].filter(Boolean).join(", ") || "Location"}</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-5 pb-28 pt-2">
        <section className="card p-5">
          <h3 className="text-lg font-bold">About us</h3>
          <p className="mt-1.5 text-ocean-700">{business.description || "Your short description will appear here."}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2"><dt><Clock className="mt-0.5 h-4 w-4 text-lagoon-700" aria-hidden /><span className="sr-only">Opening hours</span></dt><dd>{summariseHours(business.hours)}</dd></div>
            {business.publicAddress && <div className="flex items-start gap-2"><dt><MapPin className="mt-0.5 h-4 w-4 text-lagoon-700" aria-hidden /><span className="sr-only">Address</span></dt><dd>{business.publicAddress}</dd></div>}
            {business.phone && <div className="flex items-start gap-2"><dt><Phone className="mt-0.5 h-4 w-4 text-lagoon-700" aria-hidden /><span className="sr-only">Phone</span></dt><dd><a className="underline" href={`tel:${business.phone.replace(/\s/g, "")}`}>{business.phone}</a></dd></div>}
            {business.whatsapp && <div className="flex items-start gap-2"><dt><MessageSquareText className="mt-0.5 h-4 w-4 text-lagoon-700" aria-hidden /><span className="sr-only">WhatsApp</span></dt><dd>WhatsApp {business.whatsapp}</dd></div>}
            {business.email && <div className="flex items-start gap-2"><dt><Mail className="mt-0.5 h-4 w-4 text-lagoon-700" aria-hidden /><span className="sr-only">Email</span></dt><dd><a className="underline" href={`mailto:${business.email}`}>{business.email}</a></dd></div>}
          </dl>
        </section>

        <section aria-labelledby="catalog-h">
          <h3 id="catalog-h" className="mb-3 text-xl font-bold">What we offer</h3>
          {items.length === 0 ? (
            <p className="card p-5 text-ocean-600">No products or services have been listed yet. You can still send an enquiry.</p>
          ) : (
            groups.map(([g, list]) => (
              <div key={g} className="mb-5">
                <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-ocean-600">{g}</h4>
                <ul className="space-y-3">
                  {list.map((it) => (
                    <li key={it.id} className={cn("card flex items-center gap-4 p-4", !it.available && "opacity-80")}>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{it.name}</p>
                        {it.description && <p className="mt-0.5 text-sm text-ocean-600">{it.description}</p>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="font-bold text-lagoon-800">{it.price !== null ? formatKes(it.price) : "Ask for price"}</span>
                          {it.available ? <Badge tone="green">Available</Badge> : <Badge tone="neutral">Out of stock</Badge>}
                          {it.stockNote && <Badge tone="amber">{it.stockNote}</Badge>}
                        </div>
                      </div>
                      {live && it.available && (
                        cart[it.id] ? (
                          <div className="flex items-center gap-1" role="group" aria-label={`Quantity of ${it.name}`}>
                            <button onClick={() => setQty(it.id, cart[it.id] - 1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-ocean-200 bg-white hover:bg-ocean-50" aria-label={`Remove one ${it.name}`}><Minus className="h-4 w-4" /></button>
                            <span className="w-8 text-center font-bold" aria-live="polite">{cart[it.id]}</span>
                            <button onClick={() => setQty(it.id, cart[it.id] + 1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-lagoon-700 text-white hover:bg-lagoon-800" aria-label={`Add one more ${it.name}`}><Plus className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => setQty(it.id, 1)} aria-label={`Add ${it.name} to request`}><Plus className="h-4 w-4" />Add</Button>
                        )
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>

        <p className="text-center text-sm text-ocean-600">
          Requests are sent to the business. No payment is taken on this site. Never share your PIN or M-PESA codes with anyone.
        </p>
        {!live && <p className="rounded-xl bg-white p-3 text-center text-sm text-ocean-700">Preview: ordering is switched off here. Publish to let customers send requests.</p>}
      </div>

      {live && (
        <div className="sticky bottom-0 z-10 border-t border-sand-300 bg-white/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <p className="flex-1 text-sm text-ocean-700">{count > 0 ? <><strong>{count}</strong> item{count > 1 ? "s" : ""} selected</> : "Select items, or send an enquiry."}</p>
            <Button onClick={() => setOpen(true)}><ShoppingBag className="h-4 w-4" />{count > 0 ? "Send order request" : "Send an enquiry"}</Button>
          </div>
        </div>
      )}
      {live && <OrderRequestDialog open={open} onClose={() => setOpen(false)} business={business} items={items} cart={cart} onDone={() => setCart({})} />}
    </div>
  );
}
