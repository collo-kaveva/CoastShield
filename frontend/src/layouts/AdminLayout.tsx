import { Outlet, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { Badge } from "@/components/common/States";
import { Button } from "@/components/common/Button";
import { useAuthActions, useMe } from "@/hooks/queries";

export function AdminLayout() {
  const me = useMe();
  const { logout } = useAuthActions();
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-sand-100">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <header className="border-b border-sand-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3"><Logo to="/admin" /><Badge tone="navy">Administrator</Badge></div>
          <div className="flex items-center gap-3"><span className="hidden text-sm text-ocean-600 sm:inline">{me.data?.email}</span>
            <Button variant="secondary" size="sm" onClick={async () => { await logout.mutateAsync(); nav("/"); }}><LogOut className="h-4 w-4" aria-hidden />Sign out</Button></div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-5xl px-4 py-8"><Outlet /></main>
    </div>
  );
}
