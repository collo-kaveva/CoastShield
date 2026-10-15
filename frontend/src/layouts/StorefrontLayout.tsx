import { Link, Outlet } from "react-router-dom";
import { LogoMark } from "@/components/common/Logo";

/** Public storefronts use a minimal, customer-facing frame, distinct from the owner dashboard. */
export function StorefrontLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-sand-100">
      <main id="main" className="flex-1"><Outlet /></main>
      <footer className="border-t border-sand-300 bg-white px-4 py-4 text-center text-sm text-ocean-600">
        <Link to="/" className="inline-flex items-center gap-2 font-semibold text-ocean-800"><LogoMark className="h-6 w-6" />Storefront powered by CoastShield</Link>
        <p className="mt-1"><Link to="/track" className="font-semibold underline">Track a request you sent</Link></p>
        <p className="mt-1">CoastShield does not process payments. Pay only as agreed with the seller, and never share your PIN or codes.</p>
      </footer>
    </div>
  );
}
