import { UserPlus, Mail, Shield } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/common/Button";
import { useStaff, useInviteStaff } from "@/hooks/queries";
import type { StaffRole } from "@/types";

const ROLE_LABELS: Record<StaffRole, string> = {
  MANAGER: "Manager - Full access",
  SALES: "Sales - Orders & customers",
  INVENTORY: "Inventory - Catalog & stock",
  VIEWER: "Viewer - Read only",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-teal-100 text-teal-800",
  SUSPENDED: "bg-coral-100 text-coral-800",
  DELETED: "bg-sand-200 text-navy-700",
};

export function StaffManagement() {
  const { data: staff } = useStaff();
  const invite = useInviteStaff();
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("VIEWER");

  const handleInvite = () => {
    invite.mutate(
      { email, role },
      {
        onSuccess: () => {
          setShowInvite(false);
          setEmail("");
          setRole("VIEWER");
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-teal-600" />
          <h3 className="text-lg font-semibold text-navy-900">Staff Management</h3>
        </div>
        <Button onClick={() => setShowInvite(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Staff
        </Button>
      </div>

      {showInvite && (
        <div className="card p-4">
          <h4 className="font-medium text-navy-900 mb-3">Invite Team Member</h4>
          <div className="space-y-3">
            <div>
              <label className="field-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className="field-input">
                <option value="VIEWER">Viewer - Read only</option>
                <option value="INVENTORY">Inventory - Catalog & stock</option>
                <option value="SALES">Sales - Orders & customers</option>
                <option value="MANAGER">Manager - Full access</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleInvite} disabled={invite.isPending}>
                {invite.isPending ? "Sending..." : "Send Invitation"}
              </Button>
              <Button variant="secondary" onClick={() => setShowInvite(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {staff && staff.length > 0 ? (
          <div className="divide-y divide-sand-200">
            {staff.map((member) => (
              <div key={member.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-navy-900">{member.userName}</p>
                    <p className="text-sm text-sand-600">{member.userEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-sand-600">{ROLE_LABELS[member.role]}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[member.status]}`}>
                    {member.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sand-500">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No staff members yet</p>
            <p className="text-sm">Invite team members to help manage your business</p>
          </div>
        )}
      </div>
    </div>
  );
}
