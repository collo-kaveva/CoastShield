import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useVerifyPayment, usePayment } from "@/hooks/queries";
import { Loading } from "@/components/common/States";
import { Button } from "@/components/common/Button";

export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const verify = useVerifyPayment();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [orderReference, setOrderReference] = useState("");

  useEffect(() => {
    const reference = searchParams.get("reference");
    const success = searchParams.get("payment") === "success";

    if (!reference) {
      setStatus("error");
      setMessage("No payment reference provided.");
      return;
    }

    if (!success) {
      setStatus("error");
      setMessage("Payment was not completed.");
      return;
    }

    setPaymentReference(reference);

    // Verify the payment
    verify.mutate(reference, {
      onSuccess: (data) => {
        setStatus("success");
        setMessage("Payment verified successfully!");
        setOrderReference(data.orderReference);
        // Redirect to orders page after a delay
        setTimeout(() => {
          navigate("/orders", { replace: true });
        }, 3000);
      },
      onError: (error) => {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Failed to verify payment.");
      },
    });
  }, [searchParams, verify, navigate]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-lagoon-700" aria-hidden />
          <p className="mt-4 text-lg font-semibold text-navy-900">Verifying your payment...</p>
          <p className="mt-2 text-ocean-600">Please wait while we confirm your transaction.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        {status === "success" ? (
          <>
            <CheckCircle2 className="mx-auto h-16 w-16 text-teal-700" aria-hidden />
            <h1 className="mt-4 text-2xl font-bold text-navy-900">Payment Successful!</h1>
            <p className="mt-2 text-ocean-600">{message}</p>
            {paymentReference && (
              <p className="mt-4 rounded-xl bg-sand-100 py-3 font-mono text-sm">
                Payment Reference: {paymentReference}
              </p>
            )}
            {orderReference && (
              <p className="mt-2 rounded-xl bg-sand-100 py-3 font-mono text-sm">
                Order Reference: {orderReference}
              </p>
            )}
            <p className="mt-4 text-sm text-ocean-600">Redirecting to your orders...</p>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-16 w-16 text-coral-700" aria-hidden />
            <h1 className="mt-4 text-2xl font-bold text-navy-900">Payment Verification Failed</h1>
            <p className="mt-2 text-ocean-600">{message}</p>
            <Button className="mt-6" onClick={() => navigate("/orders")}>
              Back to Orders
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
