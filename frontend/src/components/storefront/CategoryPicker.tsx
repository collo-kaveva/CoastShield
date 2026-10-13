import { CATEGORIES } from "@/lib/categories";
import type { Category } from "@/types";
import { cn } from "@/lib/utils";

export function CategoryPicker({ value, onChange, error }: { value?: Category | ""; onChange: (c: Category) => void; error?: string }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ocean-800">Business category</legend>
      <div role="radiogroup" aria-label="Business category" className="grid gap-2 sm:grid-cols-2">
        {CATEGORIES.map((c) => {
          const on = value === c.value;
          return (
            <button key={c.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(c.value)}
              className={cn("flex min-h-[56px] items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition", on ? "border-lagoon-700 bg-lagoon-50" : "border-ocean-100 bg-white hover:border-ocean-300")}>
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", c.tile)}><c.icon className="h-5 w-5" aria-hidden /></span>
              <span><span className="block font-semibold">{c.label}</span><span className="block text-xs text-ocean-600">{c.itemExamples}</span></span>
            </button>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-1.5 text-sm font-medium text-coral-700">{error}</p>}
    </fieldset>
  );
}
