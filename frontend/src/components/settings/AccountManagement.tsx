import { Download, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useRequestAccountDeletion, useExportUserData } from "@/hooks/queries";

export function AccountManagement() {
  const requestDeletion = useRequestAccountDeletion();
  const exportData = useExportUserData();

  const handleRequestDeletion = () => {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone. Your data will be permanently deleted after 30 days.")) {
      requestDeletion.mutate(undefined);
    }
  };

  const handleExportData = () => {
    const data = exportData.data;
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `coastshield-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-navy-900">Account Management</h3>
      
      <div className="card p-4">
        <h4 className="font-medium text-navy-900 mb-2">Export Your Data</h4>
        <p className="text-sm text-sand-600 mb-3">
          Download all your personal data, including your business information, staff assignments, and order history.
        </p>
        <Button variant="secondary" onClick={handleExportData} disabled={!exportData.data}>
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      <div className="card p-4 border-coral-200 bg-coral-50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-coral-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-coral-900 mb-2">Delete Account</h4>
            <p className="text-sm text-coral-700 mb-3">
              Permanently delete your account and all associated data. This action cannot be undone. Your data will be permanently deleted after a 30-day grace period.
            </p>
            <Button variant="secondary" onClick={handleRequestDeletion} disabled={requestDeletion.isPending}>
              <Trash2 className="h-4 w-4 mr-2" />
              {requestDeletion.isPending ? "Requesting..." : "Request Account Deletion"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
