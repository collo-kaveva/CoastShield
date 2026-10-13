import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Banknote, Mail, Phone } from "lucide-react";
import { useOrder, useSetPayment, useTransition } from "@/hooks/queries";
import { Badge, Breadcrumbs, ErrorState, Loading } from "@/components/common/States";
import { Button, buttonClass } from "@/components/common/Button";
import { StatusBadge, StatusStepper } from "@/components/orders/StatusBadge";
import { ConfirmDialog } from "@/components/common/Modal";
import { useToast } from "@/app/ToastProvider";
import { STATUS_ACTION, STATUS_LABEL, TRANSITIONS, orderTotal } from "@/lib/orderRules";
import { errorMessage, formatDateTime, formatKes } from "@/lib/utils";
import type { OrderStatus } from "@/types";

export default function OrderDetailPage() {
  const { id = "" } = useParams();
  const q = useOrder(id);
  const move = useTransition();
  const pay = useSetPayment();
  const { toast } = useToast();
  const [cancel, setCancel] = useState(false);
  const [payConfirm, setPayConfirm] = useState(false);

  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return (
    <div className="mx-auto max-w-md py-12 text-center"><h1 className="text-3xl font-bold">Request not found</h1><p className="mt-2 text-ocean-600">It may not exist, or it belongs to another business.</p><Link to="/orders" className={`${buttonClass("primary", "md")} mt-5`}>Back to orders</Link></div>
  );
  const o = q.data;
  const next = TRANSITIONS[o.status].filter((s) => s !== "CANCELLED");
  const canCancel = TRANSITIONS[o.status].includes("CANCELLED");
  const { total, hasUnpriced } = orderTotal(o.items);
  const isEmail = o.customerContact.includes("@");

  const go = async (to: OrderStatus) => {
    try { await move.mutateAsync({ id: o.id, to }); toast(`Request marked as ${STATUS_LABEL[to].toLowerCase()}.`); setCancel(false); } catch (e) { toast(errorMessage(e), "error"); }
  };
  const setPaid = async () => {
    try { await pay.mutateAsync({ id: o.id, status: o.paymentStatus === "PAID" ? "UNPAID" : "PAID" }); toast("Payment status recorded."); setPayConfirm(false); } catch (e) { toast(errorMessage(e), "error"); }
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Orders", to: "/orders" }, { label: o.reference }]} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-bold">Request <span className="font-mono">{o.reference}</span></h1><p className="text-ocean-600">Received {formatDateTime(o.createdAt)}</p></div>
        <div className="flex items-center gap-2">{o.isSample && <Badge tone="amber">Sample data</Badge>}<StatusBadge status={o.status} /></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <section className="card p-5" aria-label="Progress"><StatusStepper status={o.status} />
            <div className="mt-5 flex flex-wrap gap-2">
              {next.map((s) => <Button key={s} onClick={() => go(s)} loading={move.isPending && move.variables?.to === s}>{STATUS_ACTION[s]}</Button>)}
              {canCancel && <Button variant="ghost" className="text-coral-700" onClick={() => setCancel(true)}>Cancel request</Button>}
              {next.length === 0 && !canCancel && <p className="text-sm text-ocean-600">This request is closed. No further changes are possible.</p>}
            </div>
          </section>
          <section className="card p-5">
            <h2 className="text-lg font-bold">Items requested</h2>
            {o.items.length === 0 ? <p className="mt-2 text-ocean-600">This is an enquiry with no items selected.</p> : (
              <table className="mt-3 w-full text-left text-sm"><caption className="sr-only">Items in this request</caption>
                <thead><tr className="border-b border-sand-200 text-ocean-600"><th className="py-2 font-semibold">Item</th><th className="py-2 text-right font-semibold">Qty</th><th className="py-2 text-right font-semibold">Price</th></tr></thead>
                <tbody>{o.items.map((l) => <tr key={l.itemId} className="border-b border-sand-100"><td className="py-2">{l.name}</td><td className="py-2 text-right">{l.quantity}</td><td className="py-2 text-right">{l.unitPrice !== null ? formatKes(l.unitPrice * l.quantity) : "Not priced"}</td></tr>)}</tbody>
                <tfoot><tr><td className="pt-3 font-bold" colSpan={2}>Estimated total</td><td className="pt-3 text-right font-bold">{formatKes(total)}{hasUnpriced && " + unpriced"}</td></tr></tfoot>
              </table>
            )}
            <p className="mt-3 text-xs text-ocean-600">Names and prices are saved as they were when the request was sent.</p>
          </section>
          {o.notes && <section className="card p-5"><h2 className="text-lg font-bold">Customer notes</h2><p className="mt-2 whitespace-pre-wrap text-ocean-800">{o.notes}</p></section>}
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-lg font-bold">Customer</h2>
            <p className="mt-2 font-semibold">{o.customerName}</p>
            <p className="mt-1 flex items-center gap-2 text-ocean-700">{isEmail ? <Mail className="h-4 w-4" aria-hidden /> : <Phone className="h-4 w-4" aria-hidden />}{isEmail ? <a className="underline" href={`mailto:${o.customerContact}`}>{o.customerContact}</a> : <a className="underline" href={`tel:${o.customerContact.replace(/\s/g, "")}`}>{o.customerContact}</a>}</p>
            <p className="mt-3 text-xs text-ocean-600">Only you can see these details.</p>
          </section>
          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold"><Banknote className="h-5 w-5 text-lagoon-700" aria-hidden />Payment</h2>
            <p className="mt-2"><Badge tone={o.paymentStatus === "PAID" ? "green" : "neutral"}>{o.paymentStatus === "PAID" ? "Recorded as paid" : "Not recorded as paid"}</Badge></p>
            <p className="mt-3 text-sm text-ocean-700">You record this yourself after checking <strong>your own</strong> M-PESA, bank or cash. CoastShield cannot verify payments, and a customer's message or screenshot is never proof.</p>
            {o.status !== "CANCELLED" && <Button className="mt-3" variant="secondary" onClick={() => setPayConfirm(true)}>{o.paymentStatus === "PAID" ? "Mark as not paid" : "Record as paid"}</Button>}
          </section>
          <section className="card p-5" aria-label="History">
            <h2 className="text-lg font-bold">History</h2>
            <ol className="mt-3 space-y-3 border-l-2 border-sand-300 pl-4">
              {[...o.history].reverse().map((h, i) => <li key={`${h.at}-${i}`} className="relative"><span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-lagoon-600" aria-hidden /><p className="font-medium">{h.label}</p><p className="text-xs text-ocean-600">{formatDateTime(h.at)}</p></li>)}
            </ol>
          </section>
        </div>
      </div>

      <ConfirmDialog open={cancel} onClose={() => setCancel(false)} onConfirm={() => go("CANCELLED")} loading={move.isPending} danger title="Cancel this request?" confirmLabel="Cancel request" message="A cancelled request cannot be reopened. Let the customer know if you can." />
      <ConfirmDialog open={payConfirm} onClose={() => setPayConfirm(false)} onConfirm={setPaid} loading={pay.isPending} title={o.paymentStatus === "PAID" ? "Mark as not paid?" : "Record as paid?"} confirmLabel={o.paymentStatus === "PAID" ? "Mark as not paid" : "Yes, I checked my account"}
        message={o.paymentStatus === "PAID" ? "This only changes your own record." : "Only continue if you have confirmed the money in your own account or received cash. This is a manual note, not a verified payment."} />
    </div>
  );
}
