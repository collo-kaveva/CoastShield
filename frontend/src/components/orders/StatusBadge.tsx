import { Ban, CheckCircle2, CircleDot, PackageCheck, ThumbsUp } from "lucide-react";
import type { OrderStatus } from "@/types";
import { STATUS_LABEL } from "@/lib/orderRules";
import { cn } from "@/lib/utils";

const STYLE: Record<OrderStatus, { cls: string; icon: typeof Ban }> = {
  NEW: { cls: "bg-sun-100 text-sun-700", icon: CircleDot },
  ACCEPTED: { cls: "bg-sky-100 text-sky-900", icon: ThumbsUp },
  READY: { cls: "bg-lagoon-100 text-lagoon-900", icon: PackageCheck },
  COMPLETED: { cls: "bg-emerald-100 text-emerald-900", icon: CheckCircle2 },
  CANCELLED: { cls: "bg-ocean-100 text-ocean-700", icon: Ban },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { cls, icon: Icon } = STYLE[status];
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", cls)}><Icon className="h-3.5 w-3.5" aria-hidden />{STATUS_LABEL[status]}</span>;
}

const STEPS: OrderStatus[] = ["NEW", "ACCEPTED", "READY", "COMPLETED"];
export function StatusStepper({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED") return <p className="rounded-xl bg-ocean-100 px-4 py-3 text-sm font-medium text-ocean-700">This request was cancelled.</p>;
  const idx = STEPS.indexOf(status);
  return (
    <ol className="flex items-center" aria-label="Order progress">
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-1 items-center last:flex-none" aria-current={i === idx ? "step" : undefined}>
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold", i <= idx ? "bg-lagoon-700 text-white" : "bg-ocean-100 text-ocean-600")}>{i < idx ? "✓" : i + 1}</span>
          <span className={cn("ml-2 hidden text-sm sm:inline", i === idx ? "font-semibold text-ocean-900" : "text-ocean-600")}>{STATUS_LABEL[s]}</span>
          {i < STEPS.length - 1 && <span className={cn("mx-2 h-0.5 flex-1", i < idx ? "bg-lagoon-700" : "bg-ocean-100")} aria-hidden />}
        </li>
      ))}
    </ol>
  );
}
