import { CreditCard, Truck, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentMethodBadgeProps {
  method: "PAYSTACK" | "CASH_ON_DELIVERY" | "MANUAL_MOBILE_MONEY";
  size?: "sm" | "md";
}

export function PaymentMethodBadge({ method, size = "md" }: PaymentMethodBadgeProps) {
  const config = {
    PAYSTACK: {
      icon: CreditCard,
      label: "Card",
      className: "bg-teal-50 text-teal-700 border-teal-200",
    },
    CASH_ON_DELIVERY: {
      icon: Truck,
      label: "Cash on Delivery",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    MANUAL_MOBILE_MONEY: {
      icon: Smartphone,
      label: "Mobile Money",
      className: "bg-sky-50 text-sky-700 border-sky-200",
    },
  };

  const { icon: Icon, label, className } = config[method];
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5 gap-1" : "text-sm px-3 py-1 gap-1.5";

  return (
    <span className={cn("inline-flex items-center rounded-full border font-medium", sizeClass, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}
