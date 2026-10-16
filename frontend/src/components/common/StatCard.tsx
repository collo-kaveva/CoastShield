import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: { value: number; positive: boolean };
  color?: "navy" | "teal" | "sky" | "amber";
  href?: string;
  className?: string;
}

const colorClasses = {
  navy: {
    bg: "bg-navy-50",
    iconBg: "bg-navy-100",
    iconColor: "text-navy-700",
    text: "text-navy-900",
  },
  teal: {
    bg: "bg-teal-50",
    iconBg: "bg-teal-100",
    iconColor: "text-teal-700",
    text: "text-teal-900",
  },
  sky: {
    bg: "bg-sky-50",
    iconBg: "bg-sky-100",
    iconColor: "text-sky-700",
    text: "text-sky-900",
  },
  amber: {
    bg: "bg-amber-50",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-700",
    text: "text-amber-900",
  },
};

export function StatCard({ icon: Icon, label, value, trend, color = "navy", href, className }: StatCardProps) {
  const colors = colorClasses[color];
  const content = (
    <>
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", colors.iconBg)}>
        <Icon className={cn("h-6 w-6", colors.iconColor)} aria-hidden />
      </div>
      <div className="flex-1">
        <p className={cn("text-sm font-medium text-sand-600", colors.text)}>{label}</p>
        <p className={cn("mt-1 text-3xl font-bold", colors.text)}>{value}</p>
        {trend && (
          <p className={cn("mt-1 text-sm font-medium", trend.positive ? "text-teal-600" : "text-coral-600")}>
            {trend.positive ? "+" : ""}{trend.value}% from last month
          </p>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <a href={href} className={cn("card flex items-center gap-4 p-5 transition hover:shadow-lift", colors.bg, className)}>
        {content}
      </a>
    );
  }

  return (
    <div className={cn("card flex items-center gap-4 p-5", colors.bg, className)}>
      {content}
    </div>
  );
}
