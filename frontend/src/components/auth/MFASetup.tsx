import { Shield, Key } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/common/Button";
import { useAuthActions } from "@/hooks/queries";

export function MFASetup() {
  const [code, setCode] = useState("");
  const [showBackup, setShowBackup] = useState(false);
  const { mfaSetup, mfaVerify } = useAuthActions();
  
  const setup = mfaSetup.mutate;
  const verify = mfaVerify.mutate;
  
  const [qrData, setQrData] = useState<{ secret: string; qr_code: string; backup_codes: string[] } | null>(null);

  const handleSetup = () => {
    setup(undefined, {
      onSuccess: (data) => {
        setQrData(data);
      },
    });
  };

  const handleVerify = () => {
    verify(code, {
      onSuccess: () => {
        setQrData(null);
        setCode("");
      },
    });
  };

  if (!qrData) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-6 w-6 text-teal-600" />
          <h3 className="text-lg font-semibold text-navy-900">Two-Factor Authentication</h3>
        </div>
        <p className="text-sand-600 mb-4">Add an extra layer of security to your account with TOTP-based authentication.</p>
        <Button onClick={handleSetup} disabled={setup.isPending}>
          {setup.isPending ? "Setting up..." : "Enable 2FA"}
        </Button>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="h-6 w-6 text-teal-600" />
        <h3 className="text-lg font-semibold text-navy-900">Setup Two-Factor Authentication</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-sand-600 mb-2">1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
          <div className="flex justify-center bg-white p-4 rounded-lg border border-sand-200">
            <img src={qrData.qr_code} alt="QR Code" className="w-48 h-48" />
          </div>
        </div>
        
        <div>
          <p className="text-sm text-sand-600 mb-2">2. Enter the 6-digit code from your app</p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            maxLength={6}
            className="field-input"
          />
        </div>
        
        <div>
          <button
            type="button"
            onClick={() => setShowBackup(!showBackup)}
            className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700"
          >
            <Key className="h-4 w-4" />
            {showBackup ? "Hide" : "Show"} backup codes
          </button>
          
          {showBackup && (
            <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800 mb-2">Save these backup codes. You can use them if you lose access to your authenticator app.</p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {qrData.backup_codes.map((code, i) => (
                  <div key={i} className="bg-white p-2 rounded border border-amber-300 text-center">
                    {code}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <Button onClick={handleVerify} disabled={verify.isPending || code.length !== 6}>
            {verify.isPending ? "Verifying..." : "Verify and Enable"}
          </Button>
          <Button variant="secondary" onClick={() => setQrData(null)}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
