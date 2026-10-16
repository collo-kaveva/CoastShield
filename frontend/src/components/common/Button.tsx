import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type Variant = "primary" | "secondary" | "ghost" | "danger" | "navy" | "light";
export type Size = "sm" | "md" | "lg";

export const buttonClass = (variant: Variant = "primary", size: Size = "md", extra?: string) =>
  cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60",
    size === "sm" && "min-h-[36px] px-3 text-sm",
    size === "md" && "min-h-[44px] px-4 text-base",
    size === "lg" && "min-h-[52px] px-6 text-lg",
    variant === "primary" && "bg-teal-600 text-white shadow-sm hover:bg-teal-700",
    variant === "navy" && "bg-navy-800 text-white hover:bg-navy-900",
    variant === "secondary" && "border border-sand-300 bg-white text-navy-800 hover:bg-sand-50",
    variant === "light" && "bg-white text-navy-900 hover:bg-sand-100",
    variant === "ghost" && "text-navy-700 hover:bg-sand-50",
    variant === "danger" && "bg-coral-600 text-white hover:bg-coral-700",
    extra,
  );

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: Size; loading?: boolean }

export const Button = forwardRef<HTMLButtonElement, Props>(function Button({ variant, size, loading, className, children, disabled, type = "button", ...rest }, ref) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
