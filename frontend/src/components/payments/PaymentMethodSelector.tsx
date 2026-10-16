import { CreditCard, Truck, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types";

interface PaymentMethodSelectorProps {
  selected: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  disabled?: boolean;
}

const METHODS: Array<{ value: PaymentMethod; label: string; description: string; icon: typeof CreditCard }> = [
  {
    value: "PAYSTACK",
    label: "Card / Mobile Money",
    description: "Pay securely with card, M-Pesa, or other mobile money options",
    icon: CreditCard,
  },
  {
    value: "CASH_ON_DELIVERY",
    label: "Cash on Delivery",
    description: "Pay with cash when your order is delivered",
    icon: Truck,
  },
  {
    value: "MANUAL_MOBILE_MONEY",
    label: "Manual Mobile Money",
    description: "Pay via mobile money and provide transaction reference for verification",
    icon: Smartphone,
  },
];

export function PaymentMethodSelector({ selected, onSelect, disabled }: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-navy-900">Select Payment Method</label>
      <div className="grid gap-3">
        {METHODS.map((method) => {
          const Icon = method.icon;
          const isSelected = selected === method.value;
          return (
            <button
              key={method.value}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(method.value)}
              className={cn(
                "flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all",
                "hover:border-lagoon-300 hover:bg-lagoon-50",
                "focus:outline-none focus:ring-2 focus:ring-lagoon-500 focus:ring-offset-2",
                isSelected ? "border-lagoon-500 bg-lagoon-50" : "border-sand-300 bg-white",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              <div className={cn(
                "mt-0.5 rounded-full p-2",
                isSelected ? "bg-lagoon-100 text-lagoon-700" : "bg-sand-100 text-sand-700"
              )}>
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="flex-1">
                <div className="font-medium text-navy-900">{method.label}</div>
                <div className="mt-0.5 text-sm text-ocean-600">{method.description}</div>
              </div>
              {isSelected && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-lagoon-500 text-white">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
