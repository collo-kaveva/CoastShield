import type { ReactNode } from "react";
import { AlertTriangle, Loader2, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <div role="status" className="flex items-center justify-center gap-3 py-16 text-ocean-600"><Loader2 className="h-5 w-5 animate-spin" aria-hidden /><span>{label}</span></div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card mx-auto my-8 max-w-md p-6 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-coral-600" aria-hidden />
      <p className="mt-3 font-semibold text-ocean-900">Something went wrong</p>
      <p className="mt-1 text-ocean-600">{message}</p>
      {onRetry && <Button variant="secondary" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-sand-300 bg-white/60 px-6 py-10 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lagoon-100 text-lagoon-800"><Icon className="h-6 w-6" aria-hidden /></span>
      <h3 className="mt-4 text-lg font-bold text-ocean-900">{title}</h3>
      {children && <p className="mx-auto mt-1 max-w-sm text-ocean-600">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "teal" | "amber" | "red" | "green" | "navy"; className?: string }) {
  const tones = { neutral: "bg-ocean-100 text-ocean-800", teal: "bg-lagoon-100 text-lagoon-900", amber: "bg-sun-100 text-sun-700", red: "bg-coral-100 text-coral-700", green: "bg-emerald-100 text-emerald-900", navy: "bg-ocean-800 text-white" };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}

export function SampleBadge() { return <Badge tone="amber">Sample data</Badge>; }

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-ocean-600">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>/</span>}
            {it.to && i < items.length - 1 ? <Link to={it.to} className="rounded underline-offset-2 hover:text-ocean-900 hover:underline">{it.label}</Link> : <span aria-current={i === items.length - 1 ? "page" : undefined} className="font-medium text-ocean-800">{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-3xl font-bold">{title}</h1>{subtitle && <p className="mt-1 text-ocean-600">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
