import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface RevenueChartProps {
  data: Array<{ month: string; revenue: number }>;
  color?: string;
  className?: string;
}

export function RevenueChart({ data, color = "#0D9488", className }: RevenueChartProps) {
  return (
    <div className={cn("h-64 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-sand-200" />
          <XAxis 
            dataKey="month" 
            className="text-xs text-sand-600"
            tick={{ fill: "#94A3B8" }}
          />
          <YAxis 
            className="text-xs text-sand-600"
            tick={{ fill: "#94A3B8" }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "#FFFFFF", 
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              fontSize: "12px"
            }}
            formatter={(value: number) => [`KES ${value.toLocaleString()}`, "Revenue"]}
          />
          <Line 
            type="monotone" 
            dataKey="revenue" 
            stroke={color} 
            strokeWidth={2}
            dot={{ fill: color, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
