import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search } from "lucide-react";
import { api } from "@/services";
import { Button } from "@/components/common/Button";
import { TextField } from "@/components/common/Fields";
import { StatusBadge, StatusStepper } from "@/components/orders/StatusBadge";
import { errorMessage, formatDateTime } from "@/lib/utils";
import type { OrderLookupResult } from "@/types";

const schema = z.object({
  reference: z.string().trim().min(1, "Enter the reference you were given.").max(12, "That reference looks too long."),
  contact: z.string().trim().min(1, "Enter the phone number or email you used."),
});
type Values = z.infer<typeof schema>;

export default function TrackPage() {
  const [params] = useSearchParams();
  const [result, setResult] = useState<OrderLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { reference: params.get("ref") ?? "", contact: "" } });

  const submit = handleSubmit(async (v) => {
    setError(null); setResult(null);
    try { setResult(await api.orders.lookup(v.reference, v.contact)); }
    catch (e) { setError(errorMessage(e)); }
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-4xl font-bold">Track your request</h1>
      <p className="mt-2 text-ocean-700">Enter the reference you received and the phone number or email you gave the business.</p>
      <form onSubmit={submit} noValidate className="card mt-6 space-y-4 p-5">
        <TextField label="Reference" placeholder="CS-XXXXXX" autoCapitalize="characters" error={errors.reference?.message} {...register("reference")} />
        <TextField label="Phone number or email" autoComplete="tel" hint="We only show a request when both match." error={errors.contact?.message} {...register("contact")} />
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}><Search className="h-4 w-4" aria-hidden />Check status</Button>
      </form>
      {error && <p role="alert" className="mt-4 rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">{error}</p>}
      {result && (
        <section aria-label="Request status" className="card mt-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">{result.businessName}</h2><StatusBadge status={result.status} /></div>
          <p className="mt-1 text-sm text-ocean-600"><span className="font-mono">{result.reference}</span> · sent {formatDateTime(result.createdAt)} · updated {formatDateTime(result.updatedAt)}</p>
          <div className="mt-5"><StatusStepper status={result.status} /></div>
          {result.items.length > 0 ? (
            <ul className="mt-5 divide-y divide-sand-200 rounded-xl border border-sand-200 text-sm">
              {result.items.map((i) => <li key={i.name} className="flex justify-between px-3 py-2"><span>{i.name}</span><span>× {i.quantity}</span></li>)}
            </ul>
          ) : <p className="mt-5 text-sm text-ocean-600">This was an enquiry with no items selected.</p>}
          <p className="mt-4 text-xs text-ocean-600">Status is set by the business. Payment is agreed directly with them; CoastShield does not process or verify payments.</p>
        </section>
      )}
      <p className="mt-8 text-center text-sm text-ocean-600">Are you a business owner? <Link to="/login" className="font-semibold text-lagoon-800 underline">Sign in</Link></p>
    </div>
  );
}
