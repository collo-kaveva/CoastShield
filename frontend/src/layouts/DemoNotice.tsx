import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { IS_DEMO } from "@/services";

export function DemoNotice({ className }: { className?: string }) {
  if (!IS_DEMO) return null;
  return (
    <p className={cn("flex items-start gap-2 rounded-xl bg-sun-50 px-3.5 py-2.5 text-sm text-sun-700", className)}>
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span><strong>Demo mode.</strong> Data stays in this browser and sign-in is simulated. It is not real security. Never enter a real password you use elsewhere.</span>
    </p>
  );
}
