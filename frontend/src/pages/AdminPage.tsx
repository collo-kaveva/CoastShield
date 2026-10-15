import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { api } from "@/services";
import { Button } from "@/components/common/Button";
import { ErrorState, Loading } from "@/components/common/States";
import { SelectField } from "@/components/common/Fields";
import { errorMessage, formatDateTime } from "@/lib/utils";

const ACTIONS = ["LOGIN_SUCCESS", "LOGIN_FAILURE", "LOGOUT", "REGISTER", "BUSINESS_PUBLISHED", "BUSINESS_UNPUBLISHED", "BUSINESS_LOGO_CHANGED",
  "ORDER_CREATED", "ORDER_STATUS_CHANGED", "ORDER_PAYMENT_RECORDED", "CHECKLIST_CHANGED", "ANALYSIS_RUN", "ANALYSIS_HISTORY_CLEARED"];

export default function AdminPage() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ["audit", action, page], queryFn: () => api.admin.auditEvents({ action: action || undefined, page }) });

  return (
    <div>
      <h1 className="flex items-center gap-2 text-3xl font-bold"><ShieldCheck className="h-7 w-7 text-lagoon-700" aria-hidden />Administration</h1>
      <p className="mt-1 text-ocean-600">Security-relevant events across the platform. This log never contains passwords, tokens, customer details or the text of checked messages, and administrators have no screen for owners' orders or catalogs.</p>
      <div className="mt-6 max-w-xs">
        <SelectField label="Filter by event type" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">All events</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </SelectField>
      </div>
      <div className="mt-4" aria-live="polite">
        {q.isLoading ? <Loading /> : q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /> : q.data!.results.length === 0 ? (
          <p className="card p-6 text-center text-ocean-600">No events match this filter.</p>
        ) : (
          <>
            <div className="card overflow-x-auto" role="region" aria-label="Audit events table (scrolls sideways on small screens)" tabIndex={0}>
              <table className="w-full min-w-[40rem] text-left text-sm">
                <caption className="sr-only">Audit events, newest first</caption>
                <thead><tr className="border-b border-sand-200 text-ocean-600"><th scope="col" className="px-4 py-3 font-semibold">When</th><th scope="col" className="px-4 py-3 font-semibold">Event</th><th scope="col" className="px-4 py-3 font-semibold">Actor</th><th scope="col" className="px-4 py-3 font-semibold">Target</th><th scope="col" className="px-4 py-3 font-semibold">Details</th></tr></thead>
                <tbody>{q.data!.results.map((e) => (
                  <tr key={e.id} className="border-b border-sand-100 align-top">
                    <td className="whitespace-nowrap px-4 py-2.5">{formatDateTime(e.createdAt)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold">{e.action}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{e.actorId ? e.actorId.slice(0, 8) : "anonymous"}</td>
                    <td className="px-4 py-2.5 text-xs">{e.targetType ? `${e.targetType} ${e.targetId.slice(0, 8)}` : "-"}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ocean-700">{Object.keys(e.metadata).length ? JSON.stringify(e.metadata) : "-"}</td>
                  </tr>))}</tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm text-ocean-600">{q.data!.count} event(s) · page {q.data!.page}</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={!q.data!.hasPrevious} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" aria-hidden />Previous</Button>
                <Button variant="secondary" size="sm" disabled={!q.data!.hasNext} onClick={() => setPage((p) => p + 1)}>Next<ChevronRight className="h-4 w-4" aria-hidden /></Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
