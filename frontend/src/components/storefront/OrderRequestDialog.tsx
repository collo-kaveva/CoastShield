import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Copy } from "lucide-react";
import type { PublicBusiness, PublicItem } from "@/types";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { TextArea, TextField } from "@/components/common/Fields";
import { useSubmitOrder } from "@/hooks/queries";
import { ApiError } from "@/services";
import { useCopy } from "@/components/common/QrCard";
import { formatKes } from "@/lib/utils";
import { orderTotal } from "@/lib/orderRules";

const schema = z.object({
  customerName: z.string().trim().min(2, "Enter your name."),
  customerContact: z.string().trim().refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^\+?[0-9][0-9\s-]{7,14}$/.test(v), "Enter a phone number or email address."),
  notes: z.string().max(500, "Notes can be up to 500 characters."),
});
type Values = z.infer<typeof schema>;

interface Props { open: boolean; onClose: () => void; business: PublicBusiness; items: PublicItem[]; cart: Record<string, number>; onDone: () => void }

export function OrderRequestDialog({ open, onClose, business, items, cart, onDone }: Props) {
  const submit = useSubmitOrder();
  const copy = useCopy();
  const [receipt, setReceipt] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { customerName: "", customerContact: "", notes: "" } });

  const lines = items.filter((i) => cart[i.id]).map((i) => ({ ...i, quantity: cart[i.id] }));
  const { total, hasUnpriced } = orderTotal(lines.map((l) => ({ unitPrice: l.price, quantity: l.quantity })));
  const isEnquiry = lines.length === 0;

  const close = () => { if (receipt) onDone(); setReceipt(null); setFormError(null); onClose(); };

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      const r = await submit.mutateAsync({ slug: business.slug, ...v, items: lines.map((l) => ({ itemId: l.id, quantity: l.quantity })) });
      setReceipt(r.reference);
    } catch (e) {
      if (e instanceof ApiError && e.fields) Object.entries(e.fields).forEach(([k, m]) => setError(k as keyof Values, { message: m }));
      setFormError(e instanceof Error ? e.message : "Could not send your request.");
    }
  });

  return (
    <Modal open={open} onClose={close} title={receipt ? "Request sent" : isEnquiry ? "Send an enquiry" : "Send your order request"}
      footer={receipt ? <Button onClick={close}>Done</Button> : <><Button variant="secondary" onClick={close}>Cancel</Button><Button loading={submit.isPending} onClick={onSubmit}>{isEnquiry ? "Send enquiry" : "Send request"}</Button></>}>
      {receipt ? (
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-lagoon-700" aria-hidden />
          <p className="mt-3 text-ocean-700">{business.name} has your request. Keep this reference to ask about it later:</p>
          <p className="my-4 rounded-xl bg-sand-100 py-3 font-mono text-2xl font-bold tracking-widest" data-testid="order-reference">{receipt}</p>
          <Button variant="secondary" size="sm" onClick={() => copy(receipt, "Reference")}><Copy className="h-4 w-4" />Copy reference</Button>
          <p className="mt-4 text-sm text-ocean-600">This is not a payment and not yet a confirmed order. The business will contact you to agree details.{business.isSample && " This is a sample business, so nobody will actually reply."}</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {lines.length > 0 && (
            <div className="rounded-xl bg-sand-100 p-3 text-sm">
              {lines.map((l) => <div key={l.id} className="flex justify-between gap-3 py-0.5"><span>{l.quantity} × {l.name}</span><span>{l.price !== null ? formatKes(l.price * l.quantity) : "Ask"}</span></div>)}
              {total > 0 && <div className="mt-1 flex justify-between border-t border-sand-300 pt-1.5 font-bold"><span>Estimated total</span><span>{formatKes(total)}{hasUnpriced && " + other items"}</span></div>}
              <p className="mt-1 text-ocean-600">Final prices are agreed with the business.</p>
            </div>
          )}
          {formError && <p role="alert" className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">{formError}</p>}
          <TextField label="Your name" autoComplete="name" error={errors.customerName?.message} {...register("customerName")} />
          <TextField label="Phone number or email" autoComplete="tel" hint="Only this business will see it." error={errors.customerContact?.message} {...register("customerContact")} />
          <TextArea label={isEnquiry ? "Your question" : "Notes (optional)"} error={errors.notes?.message} {...register("notes")} />
          <p className="text-sm text-ocean-600">Do not enter PINs, passwords or M-PESA codes anywhere on this form.</p>
        </form>
      )}
    </Modal>
  );
}
