import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreditCard, ExternalLink } from "lucide-react";
import type { PaymentMethod } from "@/types";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { TextField } from "@/components/common/Fields";
import { PaymentMethodSelector } from "@/components/payments/PaymentMethodSelector";
import { useInitializePayment, useMe } from "@/hooks/queries";
import { ApiError } from "@/services";
import { formatKes } from "@/lib/utils";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderReference: string;
  amount: number;
  onSuccess: (paymentReference: string) => void;
}

export function PaymentDialog({ open, onClose, orderId, orderReference, amount, onSuccess }: Props) {
  const me = useMe();
  const initialize = useInitializePayment();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: me.data?.email || "" }
  });

  const onSubmit = handleSubmit(async (v) => {
    if (!selectedMethod) {
      setFormError("Please select a payment method");
      return;
    }

    setFormError(null);
    try {
      const result = await initialize.mutateAsync({
        orderId,
        method: selectedMethod,
        email: v.email,
        callbackUrl: `${window.location.origin}/orders/${orderId}?payment=success`,
      });

      if (selectedMethod === "PAYSTACK" && result.authorizationUrl) {
        // Redirect to Paystack hosted checkout
        window.location.href = result.authorizationUrl;
      } else {
        // For COD and manual mobile money, show success
        onSuccess(result.paymentReference);
        onClose();
      }
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        Object.entries(e.fields).forEach(([k, m]) => setError(k as keyof Values, { message: m }));
      }
      setFormError(e instanceof Error ? e.message : "Could not initialize payment.");
    }
  });

  const close = () => {
    setSelectedMethod(null);
    setFormError(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Initialize Payment"
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button
            loading={initialize.isPending}
            onClick={onSubmit}
            disabled={!selectedMethod}
          >
            {selectedMethod === "PAYSTACK" ? "Continue to Payment" : "Create Payment"}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="rounded-xl bg-sand-100 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-navy-600">Order Reference</span>
            <span className="font-mono font-semibold">{orderReference}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-navy-600">Amount</span>
            <span className="font-bold text-teal-700">{formatKes(amount)}</span>
          </div>
        </div>

        <PaymentMethodSelector
          selected={selectedMethod}
          onSelect={setSelectedMethod}
          disabled={initialize.isPending}
        />

        {selectedMethod === "PAYSTACK" && (
          <div className="rounded-xl bg-teal-50 p-4 text-sm">
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-teal-700 mt-0.5" aria-hidden />
              <div>
                <p className="font-medium text-teal-900">Secure Payment</p>
                <p className="mt-1 text-teal-800">You will be redirected to Paystack's secure checkout to complete your payment. We accept cards, M-Pesa, and other mobile money options.</p>
              </div>
            </div>
          </div>
        )}

        {selectedMethod === "CASH_ON_DELIVERY" && (
          <div className="rounded-xl bg-amber-50 p-4 text-sm">
            <p className="font-medium text-amber-900">Cash on Delivery</p>
            <p className="mt-1 text-amber-800">Payment will be collected when the order is delivered. The order will be marked as unpaid until cash is received.</p>
          </div>
        )}

        {selectedMethod === "MANUAL_MOBILE_MONEY" && (
          <div className="rounded-xl bg-sky-50 p-4 text-sm">
            <p className="font-medium text-sky-900">Manual Mobile Money</p>
            <p className="mt-1 text-sky-800">After creating this payment, the customer will need to provide their mobile money transaction reference for manual verification by the business owner.</p>
          </div>
        )}

        {selectedMethod === "PAYSTACK" && (
          <TextField
            label="Customer Email"
            type="email"
            autoComplete="email"
            hint="Required for payment receipt"
            error={errors.email?.message}
            {...register("email")}
          />
        )}

        {formError && (
          <p role="alert" className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">
            {formError}
          </p>
        )}
      </div>
    </Modal>
  );
}
