import { useState } from "react";
import { ArrowRight, Download, RefreshCw, Search, Wallet } from "lucide-react";
import { usePayments } from "@/hooks/queries";
import { EmptyState, ErrorState, Loading } from "@/components/common/States";
import { Button, buttonClass } from "@/components/common/Button";
import { PaymentMethodBadge } from "@/components/payments/PaymentMethodBadge";
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge";
import { useToast } from "@/app/ToastProvider";
import { errorMessage, formatKes, timeAgo } from "@/lib/utils";
import type { Payment } from "@/types";

export default function PaymentsPage() {
  const q = usePayments();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  if (q.isLoading) return <Loading />;
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;

  const payments = q.data || [];

  const filteredPayments = payments.filter((p) => {
    const matchesSearch = !searchQuery || 
      p.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + p.amount, 0);

  const handleExport = () => {
    if (filteredPayments.length === 0) {
      toast("No payments to export", "error");
      return;
    }

    // Create CSV content
    const headers = ["Reference", "Customer Name", "Customer Email", "Method", "Amount", "Currency", "Status", "Created At"];
    const rows = filteredPayments.map((p) => [
      p.reference,
      p.customerName,
      p.customerEmail,
      p.method,
      p.amount.toString(),
      p.currency,
      p.status,
      p.createdAt,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `payments_export_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast("Payments exported successfully");
  };
  const pendingPayments = payments.filter((p) => p.status === "PENDING").length;
  const completedPayments = payments.filter((p) => p.status === "COMPLETED").length;
  const failedPayments = payments.filter((p) => p.status === "FAILED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="mt-1 text-navy-600">Manage your payment transactions and refunds</p>
      </div>

      {/* Stats */}
      <section aria-label="Payment statistics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <div className="text-sm font-medium text-navy-600">Total Revenue</div>
          <div className="mt-2 text-2xl font-bold text-teal-700">{formatKes(totalRevenue)}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-medium text-navy-600">Completed</div>
          <div className="mt-2 text-2xl font-bold text-teal-700">{completedPayments}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-medium text-navy-600">Pending</div>
          <div className="mt-2 text-2xl font-bold text-amber-700">{pendingPayments}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-medium text-navy-600">Failed</div>
          <div className="mt-2 text-2xl font-bold text-coral-700">{failedPayments}</div>
        </div>
      </section>

      {/* Filters */}
      <section className="card p-5">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="search" className="sr-only">Search payments</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" aria-hidden />
              <input
                id="search"
                type="text"
                placeholder="Search by reference, name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-sand-300 py-2 pl-10 pr-4 text-sm focus:border-lagoon-500 focus:outline-none focus:ring-2 focus:ring-lagoon-500/20"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-sand-300 py-2 px-4 text-sm focus:border-lagoon-500 focus:outline-none focus:ring-2 focus:ring-lagoon-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REFUNDED">Refunded</option>
          </select>
          <Button variant="secondary" onClick={() => q.refetch()} loading={q.isFetching}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refresh
          </Button>
        </div>
      </section>

      {/* Payments List */}
      <section aria-label="Payments list" className="card p-5">
        {filteredPayments.length === 0 ? (
          <EmptyState 
            icon={Wallet}
            title="No payments found"
            action={payments.length === 0 ? <p className="text-sm text-navy-600">You haven't received any payments yet.</p> : <p className="text-sm text-navy-600">No payments match your search criteria.</p>}
          >
            {payments.length === 0 ? "You haven't received any payments yet." : "No payments match your search criteria."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200 text-left">
                  <th className="pb-3 font-semibold text-navy-900">Reference</th>
                  <th className="pb-3 font-semibold text-navy-900">Customer</th>
                  <th className="pb-3 font-semibold text-navy-900">Method</th>
                  <th className="pb-3 font-semibold text-navy-900">Amount</th>
                  <th className="pb-3 font-semibold text-navy-900">Status</th>
                  <th className="pb-3 font-semibold text-navy-900">Date</th>
                  <th className="pb-3 font-semibold text-navy-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-sand-50">
                    <td className="py-3">
                      <span className="font-mono font-semibold">{payment.reference}</span>
                    </td>
                    <td className="py-3">
                      <div>
                        <div className="font-medium">{payment.customerName}</div>
                        <div className="text-xs text-navy-600">{payment.customerEmail}</div>
                      </div>
                    </td>
                    <td className="py-3">
                      <PaymentMethodBadge method={payment.method} size="sm" />
                    </td>
                    <td className="py-3 font-semibold">{formatKes(payment.amount)}</td>
                    <td className="py-3">
                      <PaymentStatusBadge status={payment.status} size="sm" />
                    </td>
                    <td className="py-3 text-navy-600">{timeAgo(payment.createdAt)}</td>
                    <td className="py-3">
                      <Button variant="ghost" size="sm" className="text-teal-800">
                        View Details
                        <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Export */}
      <section className="flex justify-end">
        <Button variant="secondary" onClick={handleExport} disabled={filteredPayments.length === 0}>
          <Download className="mr-2 h-4 w-4" aria-hidden />
          Export CSV
        </Button>
      </section>
    </div>
  );
}
