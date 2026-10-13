import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, Package, ShieldCheck, Store } from "lucide-react";
import { useDashboard, usePublish, useUnpublish } from "@/hooks/queries";
import { Badge, EmptyState, ErrorState, Loading, SampleBadge } from "@/components/common/States";
import { Button, buttonClass } from "@/components/common/Button";
import { QrCard } from "@/components/common/QrCard";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { useToast } from "@/app/ToastProvider";
import { errorMessage, formatKes, storeUrl, timeAgo } from "@/lib/utils";
import { orderTotal } from "@/lib/orderRules";
import { useMe } from "@/hooks/queries";

export default function DashboardPage() {
  const me = useMe();
  const q = useDashboard();
  const publish = usePublish();
  const unpublish = useUnpublish();
  const { toast } = useToast();
  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data?.business) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const { business: b, completion, itemCount, newOrders, outstandingOrders, recentOrders, checklist } = q.data;
  const published = b.status === "PUBLISHED";
  const pct = checklist.total ? Math.round((checklist.done / checklist.total) * 100) : 0;

  const toggle = async () => {
    try {
      if (published) { await unpublish.mutateAsync(undefined); toast("Your storefront is now a private draft."); }
      else { await publish.mutateAsync(undefined); toast("Your storefront is live."); }
    } catch (e) { toast(errorMessage(e), "error"); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Habari, {me.data?.name.split(" ")[0]} 👋</h1>
        <p className="mt-1 text-ocean-600">Here is how {b.name} is doing.</p>
        {b.isSample && <p className="mt-2 flex items-center gap-2 text-sm text-ocean-700"><SampleBadge />This account contains fictional sample data for the demo.</p>}
      </div>

      <section aria-label="Storefront status" className="card grid gap-5 p-5 md:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2"><Store className="h-5 w-5 text-lagoon-700" aria-hidden /><h2 className="text-xl font-bold">Your storefront</h2><Badge tone={published ? "green" : "amber"}>{published ? "Published" : "Draft: not public"}</Badge></div>
          <div className="mt-4">
            <div className="flex justify-between text-sm font-semibold"><span>Profile completion</span><span>{completion.percent}%</span></div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ocean-100" role="progressbar" aria-valuenow={completion.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completion"><div className="h-full rounded-full bg-lagoon-600" style={{ width: `${completion.percent}%` }} /></div>
            {completion.missing.length > 0 ? <p className="mt-2 text-sm text-ocean-600">Still to add: {completion.missing.join(", ")}.</p> : <p className="mt-2 text-sm text-lagoon-800">Your profile is complete.</p>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/business" className={buttonClass("secondary", "md")}>Edit storefront</Link>
            <Link to={`/store/${b.slug}${published ? "" : "?preview=1"}`} className={buttonClass("secondary", "md")}>{published ? "View storefront" : "Preview storefront"}</Link>
            <Button onClick={toggle} loading={publish.isPending || unpublish.isPending} variant={published ? "ghost" : "primary"}>{published ? "Unpublish" : "Publish"}</Button>
          </div>
        </div>
        <div className="md:w-56">{published ? <QrCard url={storeUrl(b.slug)} name={b.name} /> : <div className="rounded-xl bg-sand-100 p-4 text-center text-sm text-ocean-700">Publish your storefront to get a link and QR code to share.</div>}</div>
      </section>

      <Link to="/security" className="group flex items-center gap-4 rounded-2xl bg-ocean-900 p-5 text-white shadow-card transition hover:bg-ocean-800">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-lagoon-600"><ShieldCheck className="h-6 w-6" aria-hidden /></span>
        <span className="flex-1"><span className="block text-lg font-bold">Got a suspicious message?</span><span className="text-ocean-100">Check it with the security assistant before you reply, click or pay.</span></span>
        <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" aria-hidden />
      </Link>

      <section aria-label="At a glance" className="grid grid-cols-3 gap-3">
        {[{ label: "New requests", value: newOrders, to: "/orders", icon: ClipboardList }, { label: "Open requests", value: outstandingOrders, to: "/orders", icon: ClipboardList }, { label: "Catalog items", value: itemCount, to: "/business/catalog", icon: Package }].map((s) => (
          <Link key={s.label} to={s.to} className="card p-4 transition hover:shadow-lift"><s.icon className="h-5 w-5 text-lagoon-700" aria-hidden /><p className="mt-2 text-3xl font-bold">{s.value}</p><p className="text-sm text-ocean-600">{s.label}</p></Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section aria-label="Recent order requests" className="card p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">Recent requests</h2><Link to="/orders" className="text-sm font-semibold text-lagoon-800 underline">View all</Link></div>
          {recentOrders.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No requests yet" action={<Link to={`/store/${b.slug}${published ? "" : "?preview=1"}`} className={buttonClass("secondary", "md")}>{published ? "Open your storefront" : "Preview your storefront"}</Link>}>
              {published ? "Share your link or QR code. Requests from customers will appear here." : "Publish your storefront, then share it so customers can send requests."}
            </EmptyState>
          ) : (
            <ul className="divide-y divide-sand-200">
              {recentOrders.map((o) => (
                <li key={o.id}><Link to={`/orders/${o.id}`} className="flex items-center gap-3 rounded-lg py-3 hover:bg-sand-50">
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">{o.customerName}</p><p className="text-sm text-ocean-600">{o.reference} · {timeAgo(o.createdAt)}{(() => { const t = orderTotal(o.items); return t.total > 0 ? ` · ${formatKes(t.total)}` : ""; })()}</p></div>
                  <StatusBadge status={o.status} />
                </Link></li>
              ))}
            </ul>
          )}
        </section>
        <section aria-label="Security checklist progress" className="card p-5">
          <h2 className="text-xl font-bold">Security checklist</h2>
          <p className="mt-1 text-ocean-600">{checklist.done} of {checklist.total} steps done</p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ocean-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Security checklist progress"><div className="h-full rounded-full bg-lagoon-600" style={{ width: `${pct}%` }} /></div>
          <Link to="/security/checklist" className={`${buttonClass("secondary", "md")} mt-4 w-full`}>{checklist.done === 0 ? "Start the checklist" : "Continue checklist"}</Link>
        </section>
      </div>
    </div>
  );
}
