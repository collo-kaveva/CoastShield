import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Search } from "lucide-react";
import { useBusiness, useOrders } from "@/hooks/queries";
import { Breadcrumbs, EmptyState, ErrorState, Loading, PageHeader } from "@/components/common/States";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { buttonClass } from "@/components/common/Button";
import { STATUS_LABEL, orderTotal } from "@/lib/orderRules";
import { cn, errorMessage, formatKes, timeAgo } from "@/lib/utils";
import type { OrderStatus } from "@/types";

const FILTERS: (OrderStatus | "ALL")[] = ["ALL", "NEW", "ACCEPTED", "READY", "COMPLETED", "CANCELLED"];

export default function OrdersPage() {
  const q = useOrders();
  const biz = useBusiness();
  const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const orders = q.data ?? [];
  const counts = useMemo(() => { const c: Record<string, number> = { ALL: orders.length }; orders.forEach((o) => (c[o.status] = (c[o.status] ?? 0) + 1)); return c; }, [orders]);
  const list = orders.filter((o) => (status === "ALL" || o.status === status) && `${o.reference} ${o.customerName}`.toLowerCase().includes(search.trim().toLowerCase()));

  if (q.isLoading) return <Loading />;
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const published = biz.data?.status === "PUBLISHED";

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Orders" }]} />
      <PageHeader title="Orders & enquiries" subtitle="Requests customers sent from your storefront." />
      {orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No requests yet" action={biz.data && <Link to={`/store/${biz.data.slug}${published ? "" : "?preview=1"}`} className={buttonClass("primary", "md")}>{published ? "Open your storefront" : "Preview your storefront"}</Link>}>
          {published ? "Share your link or QR code so customers can send requests." : "Publish your storefront first, then share it."}
        </EmptyState>
      ) : (
        <>
          <div className="relative mb-3 max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ocean-500" aria-hidden /><input aria-label="Search by reference or customer name" placeholder="Search reference or customer" className="field-input pl-10" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <div role="group" aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2">
            {FILTERS.map((f) => <button key={f} onClick={() => setStatus(f)} aria-pressed={status === f} className={cn("min-h-[44px] rounded-full border px-4 text-sm font-semibold", status === f ? "border-ocean-900 bg-ocean-900 text-white" : "border-ocean-200 bg-white hover:bg-ocean-50")}>{f === "ALL" ? "All" : STATUS_LABEL[f]} ({counts[f] ?? 0})</button>)}
          </div>
          {list.length === 0 ? <p className="card p-6 text-center text-ocean-600">No requests match your filters.</p> : (
            <ul className="space-y-3">
              {list.map((o) => { const t = orderTotal(o.items); return (
                <li key={o.id}><Link to={`/orders/${o.id}`} className="card flex flex-wrap items-center gap-3 p-4 transition hover:shadow-lift">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{o.customerName}</p>
                    <p className="text-sm text-ocean-600"><span className="font-mono">{o.reference}</span> · {timeAgo(o.createdAt)} · {o.items.length ? `${o.items.reduce((s, l) => s + l.quantity, 0)} item(s)` : "Enquiry"}{t.total > 0 && ` · ${formatKes(t.total)}`}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </Link></li>
              ); })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
