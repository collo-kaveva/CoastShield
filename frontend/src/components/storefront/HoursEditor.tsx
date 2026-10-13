import type { OpeningHours } from "@/types";
import { Button } from "@/components/common/Button";

export function HoursEditor({ value, onChange }: { value: OpeningHours[]; onChange: (v: OpeningHours[]) => void }) {
  const set = (i: number, patch: Partial<OpeningHours>) => onChange(value.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  const applyFirst = () => { const f = value.find((h) => !h.closed) ?? value[0]; onChange(value.map((h) => (h.closed ? h : { ...h, open: f.open, close: f.close }))); };
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ocean-800">Opening hours</legend>
      <ul className="space-y-2">
        {value.map((h, i) => (
          <li key={h.day} className="grid grid-cols-[5.5rem_1fr] items-center gap-2 sm:grid-cols-[7rem_auto_1fr]">
            <span className="text-sm font-medium">{h.day}</span>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-lagoon-700" checked={h.closed} onChange={(e) => set(i, { closed: e.target.checked })} />Closed</label>
            <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
              <input aria-label={`${h.day} opening time`} type="time" className="field-input !min-h-[40px] !py-1.5" value={h.open} disabled={h.closed} onChange={(e) => set(i, { open: e.target.value })} />
              <span aria-hidden>to</span>
              <input aria-label={`${h.day} closing time`} type="time" className="field-input !min-h-[40px] !py-1.5" value={h.close} disabled={h.closed} onChange={(e) => set(i, { close: e.target.value })} />
            </div>
          </li>
        ))}
      </ul>
      <Button size="sm" variant="ghost" className="mt-2" onClick={applyFirst}>Use the first open day's hours for all open days</Button>
    </fieldset>
  );
}
