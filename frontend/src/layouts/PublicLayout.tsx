import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { buttonClass } from "@/components/common/Button";
import { useMe } from "@/hooks/queries";

const NAV = [
  { href: "/#features", label: "Features" }, { href: "/#how-it-works", label: "How it works" },
  { href: "/#categories", label: "Business categories" }, { href: "/#security", label: "Security" },
];

export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const me = useMe();
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-sand-200 bg-sand-50/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
            {NAV.map((n) => <a key={n.href} href={n.href} className="rounded text-sm font-semibold text-ocean-700 hover:text-ocean-900">{n.label}</a>)}
            <NavLink to="/discover" className="rounded text-sm font-semibold text-ocean-700 hover:text-ocean-900">Browse businesses</NavLink>
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            {me.data ? <Link to="/dashboard" className={buttonClass("primary", "md")}>Go to dashboard</Link> : <>
              <Link to="/login" className={buttonClass("ghost", "md")}>Sign in</Link>
              <Link to="/register" className={buttonClass("primary", "md")}>Get Started Free</Link>
            </>}
          </div>
          <button className="flex h-11 w-11 items-center justify-center rounded-lg text-ocean-800 hover:bg-ocean-50 lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <nav id="mobile-nav" aria-label="Mobile" className="border-t border-sand-200 bg-white px-4 py-3 lg:hidden">
            <ul className="space-y-1">
              {NAV.map((n) => <li key={n.href}><a href={n.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 font-semibold text-ocean-800 hover:bg-ocean-50">{n.label}</a></li>)}
              <li><Link to="/discover" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 font-semibold text-ocean-800 hover:bg-ocean-50">Browse businesses</Link></li>
            </ul>
            <div className="mt-3 grid gap-2">
              {me.data ? <Link to="/dashboard" className={buttonClass("primary", "lg")}>Go to dashboard</Link> : <>
                <Link to="/register" className={buttonClass("primary", "lg")}>Get Started Free</Link>
                <Link to="/login" className={buttonClass("secondary", "lg")}>Sign in</Link>
              </>}
            </div>
          </nav>
        )}
      </header>
      <main id="main" className="flex-1"><Outlet /></main>
      <footer className="bg-ocean-900 text-ocean-100">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.5fr_1fr]">
          <div>
            <Logo light />
            <p className="mt-3 max-w-sm text-sm text-ocean-200">A hackathon prototype helping small businesses in coastal Kenya go digital and stay safer online. Sample data is labelled as such.</p>
          </div>
          <nav aria-label="Footer"><ul className="grid grid-cols-2 gap-2 text-sm">
            <li><Link className="hover:underline" to="/about">About</Link></li>
            <li><a className="hover:underline" href="/#features">Features</a></li>
            <li><a className="hover:underline" href="/#security">Security</a></li>
            <li><Link className="hover:underline" to="/privacy">Privacy</Link></li>
            <li><Link className="hover:underline" to="/contact">Contact</Link></li>
          </ul></nav>
        </div>
        <p className="border-t border-ocean-800 px-4 py-4 text-center text-xs text-ocean-300">CoastShield gives guidance only. It cannot guarantee protection from fraud or verify mobile-money payments.</p>
      </footer>
    </div>
  );
}
