import { Outlet } from "react-router-dom";
import { Logo } from "@/components/common/Logo";
import { DemoNotice } from "./DemoNotice";
import { ShieldCheck, Store, Waves } from "lucide-react";

export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-ocean-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo light />
        <div>
          <Waves className="mb-4 h-10 w-10 text-lagoon-300" aria-hidden />
          <p className="font-display text-4xl font-bold leading-tight">Your storefront, your orders, your safety, in one place.</p>
          <ul className="mt-8 space-y-4 text-ocean-100">
            <li className="flex gap-3"><Store className="h-6 w-6 shrink-0 text-lagoon-300" aria-hidden />No website skills needed. Share a link or QR code.</li>
            <li className="flex gap-3"><ShieldCheck className="h-6 w-6 shrink-0 text-lagoon-300" aria-hidden />Learn to spot scam messages before they cost you.</li>
          </ul>
        </div>
        <p className="text-sm text-ocean-300">Built for small businesses along the Kenyan coast.</p>
      </aside>
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="mb-6 lg:hidden"><Logo /></div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <DemoNotice className="mb-6" />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
