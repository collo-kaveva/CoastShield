import { useState } from "react";
import { Mail, X } from "lucide-react";
import { useAuthActions } from "@/hooks/queries";
import { Button } from "@/components/common/Button";

export function EmailVerificationBanner() {
  const { verifyEmail, resendVerification } = useAuthActions();
  const [showInput, setShowInput] = useState(false);
  const [token, setToken] = useState("");

  const handleVerify = () => {
    verifyEmail(token, {
      onSuccess: () => {
        setShowInput(false);
        setToken("");
      },
    });
  };

  const handleResend = () => {
    resendVerification(undefined);
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <Mail className="h-5 w-5 text-amber-600 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-amber-900">
            <strong>Email verification required</strong> - Please verify your email address to access all features.
          </p>
          
          {showInput ? (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter verification token"
                className="flex-1 field-input text-sm"
              />
              <Button size="sm" onClick={handleVerify} disabled={!token}>
                Verify
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowInput(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShowInput(true)}>
                Enter Token
              </Button>
              <Button size="sm" variant="ghost" onClick={handleResend}>
                Resend Email
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
