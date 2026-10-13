import { useState } from "react";
import { useToast } from "@/app/ToastProvider";
import { useChecklist, useToggleChecklist } from "@/hooks/queries";
import { Breadcrumbs, ErrorState, Loading, PageHeader } from "@/components/common/States";
import { errorMessage } from "@/lib/utils";

export default function ChecklistPage() {
  const q = useChecklist();
  const toggle = useToggleChecklist();
  const { toast } = useToast();
  // Holds a tick instantly while the request is in flight so the control responds at once, even on slow networks.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const done = q.data.filter((c) => c.done).length;
  const pct = Math.round((done / q.data.length) * 100);
  const groups = [...new Set(q.data.map((c) => c.group))];

  const flip = async (key: string, value: boolean) => {
    setPending((p) => ({ ...p, [key]: value }));
    try { await toggle.mutateAsync({ key, done: value }); if (value && done + 1 === q.data!.length) toast("All steps complete. Well done!"); }
    catch (e) { toast(errorMessage(e), "error"); }
    finally { setPending((p) => { const n = { ...p }; delete n[key]; return n; }); }
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Security centre", to: "/security" }, { label: "Checklist" }]} />
      <PageHeader title="Security checklist" subtitle="Small steps that make your business harder to scam. Tick each one when you have done it." />
      <div className="card mb-6 p-5">
        <div className="flex justify-between text-sm font-semibold"><span>{done} of {q.data.length} done</span><span>{pct}%</span></div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-ocean-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Checklist progress"><div className="h-full rounded-full bg-lagoon-600 transition-all" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 text-xs text-ocean-600">Progress is saved to your account. You are marking your own habits; CoastShield cannot check them for you.</p>
      </div>
      <div className="space-y-6">
        {groups.map((g) => (
          <fieldset key={g} className="card p-5">
            <legend className="px-1 text-lg font-bold">{g}</legend>
            <ul className="mt-2 divide-y divide-sand-200">
              {q.data!.filter((c) => c.group === g).map((c) => (
                <li key={c.key} className="py-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={pending[c.key] ?? c.done} onChange={(e) => flip(c.key, e.target.checked)} className="mt-1 h-6 w-6 shrink-0 accent-lagoon-700" />
                    <span><span className={`block font-semibold ${c.done ? "text-ocean-500 line-through" : ""}`}>{c.title}</span><span className="block text-sm text-ocean-600">{c.description}</span></span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
