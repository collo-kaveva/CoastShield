import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, ClipboardList, Package, ShieldCheck, Store, TrendingUp, Wallet } from "lucide-react";
import { useDashboard, usePublish, useUnpublish } from "@/hooks/queries";
import { Badge, EmptyState, ErrorState, Loading, SampleBadge } from "@/components/common/States";
import { Button, buttonClass } from "@/components/common/Button";
import { QrCard } from "@/components/common/QrCard";
import { StatCard } from "@/components/common/StatCard";
import { RevenueChart } from "@/components/common/RevenueChart";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { useToast } from "@/app/ToastProvider";
import { errorMessage, formatKes, storeUrl, timeAgo } from "@/lib/utils";
import { orderTotal } from "@/lib/orderRules";
import { useMe } from "@/hooks/queries";

export default function DashboardPage() {
  const { t } = useTranslation();
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
      if (published) { await unpublish.mutateAsync(undefined); toast(t("dashboard.storefrontDraft")); }
      else { await publish.mutateAsync(undefined); toast(t("dashboard.storefrontLive")); }
    } catch (e) { toast(errorMessage(e), "error"); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("dashboard.greeting")}, {me.data?.name.split(" ")[0]} 👋</h1>
        <p className="mt-1 text-navy-600">{t("dashboard.subtitle", { name: b.name })}</p>
        {b.isSample && <p className="mt-2 flex items-center gap-2 text-sm text-navy-700"><SampleBadge />{t("dashboard.sampleData")}</p>}
      </div>

      <section aria-label="Storefront status" className="card grid gap-5 p-5 md:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2"><Store className="h-5 w-5 text-teal-700" aria-hidden /><h2 className="text-xl font-bold">{t("dashboard.storefront")}</h2><Badge tone={published ? "green" : "amber"}>{published ? t("dashboard.published") : t("dashboard.draft")}</Badge></div>
          <div className="mt-4">
            <div className="flex justify-between text-sm font-semibold"><span>{t("dashboard.profileCompletion")}</span><span>{completion.percent}%</span></div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-sand-200" role="progressbar" aria-valuenow={completion.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completion"><div className="h-full rounded-full bg-teal-600" style={{ width: `${completion.percent}%` }} /></div>
            {completion.missing.length > 0 ? <p className="mt-2 text-sm text-navy-600">{t("dashboard.stillToAdd", { items: completion.missing.join(", ") })}</p> : <p className="mt-2 text-sm text-teal-800">{t("dashboard.profileComplete")}</p>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/business" className={buttonClass("secondary", "md")}>{t("dashboard.editStorefront")}</Link>
            <Link to={`/store/${b.slug}${published ? "" : "?preview=1"}`} className={buttonClass("secondary", "md")}>{published ? t("dashboard.viewStorefront") : t("dashboard.previewStorefront")}</Link>
            <Button onClick={toggle} loading={publish.isPending || unpublish.isPending} variant={published ? "ghost" : "primary"}>{published ? t("dashboard.unpublish") : t("dashboard.publish")}</Button>
          </div>
        </div>
        <div className="md:w-56">{published ? <QrCard url={storeUrl(b.slug)} name={b.name} /> : <div className="rounded-xl bg-sand-100 p-4 text-center text-sm text-navy-700">{t("dashboard.qrPrompt")}</div>}</div>
      </section>

      <Link to="/security" className="group flex items-center gap-4 rounded-2xl bg-navy-900 p-5 text-white shadow-card transition hover:bg-navy-800">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-600"><ShieldCheck className="h-6 w-6" aria-hidden /></span>
        <span className="flex-1"><span className="block text-lg font-bold">{t("dashboard.securityCta")}</span><span className="text-navy-100">{t("dashboard.securitySub")}</span></span>
        <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" aria-hidden />
      </Link>

      <section aria-label="Analytics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wallet} label={t("dashboard.totalRevenue")} value={formatKes(q.data?.analytics?.totalRevenue || 0)} color="teal" />
        <StatCard icon={TrendingUp} label={t("dashboard.thisMonth")} value={formatKes(q.data?.analytics?.thisMonthRevenue || 0)} color="sky" />
        <StatCard icon={ClipboardList} label={t("dashboard.newRequests")} value={newOrders} color="amber" href="/orders" />
        <StatCard icon={Package} label={t("dashboard.catalogItems")} value={itemCount} color="navy" href="/business/catalog" />
      </section>

      <section aria-label="Revenue chart" className="card p-5">
        <h2 className="text-xl font-bold">{t("dashboard.revenueOverTime")}</h2>
        <p className="mt-1 text-sm text-navy-600">{t("dashboard.revenueSubtitle")}</p>
        <RevenueChart data={q.data?.analytics?.revenueByMonth || []} className="mt-4" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section aria-label="Recent order requests" className="card p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">{t("dashboard.recentRequests")}</h2><Link to="/orders" className="text-sm font-semibold text-teal-800 underline">{t("dashboard.viewAll")}</Link></div>
          {recentOrders.length === 0 ? (
            <EmptyState icon={ClipboardList} title={t("dashboard.noRequests")} action={<Link to={"/store/" + b.slug + (published ? "" : "?preview=1")} className={buttonClass("secondary", "md")}>{published ? t("dashboard.openStorefront") : t("dashboard.previewStorefrontBtn")}</Link>}>
              {published ? t("dashboard.shareLink") : t("dashboard.publishFirst")}
            </EmptyState>
          ) : (
            <ul className="divide-y divide-sand-200">
              {recentOrders.map((o) => (
                <li key={o.id}><Link to={`/orders/${o.id}`} className="flex items-center gap-3 rounded-lg py-3 hover:bg-sand-50">
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">{o.customerName}</p><p className="text-sm text-navy-600">{o.reference} · {timeAgo(o.createdAt)}{(() => { const t = orderTotal(o.items); return t.total > 0 ? ` · ${formatKes(t.total)}` : ""; })()}</p></div>
                  <StatusBadge status={o.status} />
                </Link></li>
              ))}
            </ul>
          )}
        </section>
        <section aria-label="Security checklist progress" className="card p-5">
          <h2 className="text-xl font-bold">{t("dashboard.securityChecklist")}</h2>
          <p className="mt-1 text-navy-600">{t("dashboard.checklistProgress", { done: checklist.done, total: checklist.total })}</p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-sand-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Security checklist progress"><div className="h-full rounded-full bg-teal-600" style={{ width: `${pct}%` }} /></div>
          <Link to="/security/checklist" className={`${buttonClass("secondary", "md")} mt-4 w-full`}>{checklist.done === 0 ? t("dashboard.startChecklist") : t("dashboard.continueChecklist")}</Link>
        </section>
      </div>
    </div>
  );
}
