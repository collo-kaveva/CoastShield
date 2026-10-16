import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { ClipboardList, ExternalLink, LayoutDashboard, LogOut, Package, Settings, ShieldCheck, Store, Wallet } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { useAuthActions, useBusiness, useMe, useOrders } from "@/hooks/queries";
import { cn } from "@/lib/utils";
import { useToast } from "@/app/ToastProvider";
import { DemoNotice } from "./DemoNotice";
import { Badge } from "@/components/common/States";
import { ConfirmDialog } from "@/components/common/Modal";

export function OwnerLayout() {
  const me = useMe();
  const biz = useBusiness();
  const orders = useOrders();
  const { logout } = useAuthActions();
  const nav = useNavigate();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const newCount = (orders.data ?? []).filter((o) => o.status === "NEW").length;

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/business", label: "My storefront", icon: Store },
    { to: "/business/catalog", label: "Catalog", icon: Package },
    { to: "/orders", label: "Orders", icon: ClipboardList, badge: newCount },
    { to: "/payments", label: "Payments", icon: Wallet },
    { to: "/security", label: "Security centre", icon: ShieldCheck },
    { to: "/settings", label: "Settings", icon: Settings },
  ];
  const mobile = [links[0], links[2], links[3], links[4], links[5], links[6]];

  const doLogout = async () => { await logout.mutateAsync(); toast("You have signed out."); nav("/"); };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <aside className="hidden border-r border-ocean-800 bg-ocean-900 p-5 text-ocean-100 lg:flex lg:flex-col">
        <Logo to="/dashboard" light />
        <nav aria-label="Dashboard" className="mt-8 flex-1">
          <ul className="space-y-1">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} end={l.to === "/business"} className={({ isActive }) => cn("flex min-h-[44px] items-center gap-3 rounded-xl px-3 font-semibold transition", isActive ? "bg-white/15 text-white" : "hover:bg-white/10")}>
                  <l.icon className="h-5 w-5" aria-hidden />{l.label}
                  {l.badge ? <span className="ml-auto rounded-full bg-sun-500 px-2 py-0.5 text-xs font-bold text-ocean-900" aria-label={`${l.badge} new`}>{l.badge}</span> : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-3">
          <LanguageSwitcher />
          <p className="text-xs text-navy-300">Signed in as {me.data?.email}</p>
          <button onClick={() => setConfirm(true)} className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 font-semibold hover:bg-white/10"><LogOut className="h-5 w-5" aria-hidden />Sign out</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-sand-200 bg-white/95 px-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className="lg:hidden"><Link to="/dashboard" aria-label="Dashboard"><img src="/favicon.svg" alt="" className="h-8 w-8" /></Link></div>
            <p className="truncate font-semibold">{biz.data?.name ?? "Welcome"}</p>
            {biz.data && <Badge tone={biz.data.status === "PUBLISHED" ? "green" : "amber"}>{biz.data.status === "PUBLISHED" ? "Published" : "Draft"}</Badge>}
          </div>
          {biz.data && (
            <Link to={`/store/${biz.data.slug}${biz.data.status === "DRAFT" ? "?preview=1" : ""}`} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-lagoon-800 hover:bg-lagoon-50">
              <ExternalLink className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">View storefront</span><span className="sm:hidden">View</span>
            </Link>
          )}
        </header>
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
          <DemoNotice className="mb-6" />
          <Outlet />
        </main>
      </div>

      <nav aria-label="Dashboard mobile" className="fixed inset-x-0 bottom-0 z-40 border-t border-sand-300 bg-white lg:hidden">
        <ul className="grid grid-cols-5">
          {mobile.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} className={({ isActive }) => cn("relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold", isActive ? "text-lagoon-800" : "text-ocean-600")}>
                <l.icon className="h-5 w-5" aria-hidden />{l.label === "Security centre" ? "Security" : l.label}
                {l.badge ? <span className="absolute right-4 top-1.5 h-2.5 w-2.5 rounded-full bg-coral-500" aria-label={`${l.badge} new`} /> : null}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={doLogout} loading={logout.isPending} title="Sign out?" message="You will need to sign in again to manage your storefront." confirmLabel="Sign out" />
    </div>
  );
}
