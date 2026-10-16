import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentStatusBadgeProps {
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED" | "REFUNDED";
  size?: "sm" | "md";
}

export function PaymentStatusBadge({ status, size = "md" }: PaymentStatusBadgeProps) {
  const config = {
    PENDING: {
      icon: Clock,
      label: "Pending",
      className: "bg-amber-100 text-amber-800 border-amber-200",
    },
    PROCESSING: {
      icon: Clock,
      label: "Processing",
      className: "bg-sky-100 text-sky-800 border-sky-200",
    },
    COMPLETED: {
      icon: CheckCircle2,
      label: "Paid",
      className: "bg-teal-100 text-teal-800 border-teal-200",
    },
    FAILED: {
      icon: XCircle,
      label: "Failed",
      className: "bg-coral-100 text-coral-800 border-coral-200",
    },
    CANCELLED: {
      icon: XCircle,
      label: "Cancelled",
      className: "bg-sand-200 text-navy-700 border-sand-300",
    },
    REFUNDED: {
      icon: AlertCircle,
      label: "Refunded",
      className: "bg-navy-100 text-navy-800 border-navy-200",
    },
  };

  const { icon: Icon, label, className } = config[status];
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5 gap-1" : "text-sm px-3 py-1 gap-1.5";

  return (
    <span className={cn("inline-flex items-center rounded-full border font-medium", sizeClass, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}
