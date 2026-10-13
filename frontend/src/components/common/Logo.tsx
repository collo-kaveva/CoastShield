import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-9 w-9", className)} aria-hidden>
      <rect width="64" height="64" rx="14" fill="#0B2545" />
      <path d="M32 10 L50 17 V31 C50 42 42 50 32 54 C22 50 14 42 14 31 V17 Z" fill="#1BA79A" />
      <path d="M19 33 q4.5 -5 9 0 t9 0 t9 0" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ to = "/", light = false }: { to?: string; light?: boolean }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5 rounded-lg" aria-label="CoastShield home">
      <LogoMark />
      <span className={cn("font-display text-xl font-bold tracking-tight", light ? "text-white" : "text-ocean-900")}>CoastShield</span>
    </Link>
  );
}
