import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services";
import type { BusinessInput, CatalogInput, OrderInput } from "@/services/types";
import type { Category, OrderStatus, PaymentStatus, PaymentMethod } from "@/types";

/** Every mutation refreshes all cached data except the session: simple and always consistent in the MVP. */
function useRefreshing<TIn, TOut>(fn: (v: TIn) => Promise<TOut>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "me" }) });
}

export const useMe = () => useQuery({ queryKey: ["me"], queryFn: () => api.auth.me(), staleTime: Infinity });
export const useBusiness = () => useQuery({ queryKey: ["business"], queryFn: () => api.business.get() });
export const useCatalog = () => useQuery({ queryKey: ["catalog"], queryFn: () => api.catalog.list() });
export const useOrders = () => useQuery({ queryKey: ["orders"], queryFn: () => api.orders.list() });
export const useOrder = (id: string) => useQuery({ queryKey: ["orders", id], queryFn: () => api.orders.get(id), retry: false });
export const useDashboard = () => useQuery({ queryKey: ["dashboard"], queryFn: () => api.dashboard.summary() });
export const useChecklist = () => useQuery({ queryKey: ["checklist"], queryFn: () => api.security.checklist() });
export const useIncidents = () => useQuery({ queryKey: ["incidents"], queryFn: () => api.security.incidents(), staleTime: Infinity });
export const useStorefront = (slug: string, preview: boolean) =>
  useQuery({ queryKey: ["storefront", slug, preview], queryFn: () => api.storefront.get(slug, { preview }), retry: false });
export const useDiscover = (category: Category | "ALL", q: string) =>
  useQuery({ queryKey: ["discover", category, q], queryFn: () => api.storefront.list({ category, q }) });

export function useAuthActions() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries();
  return {
    login: useMutation({ mutationFn: (v: { email: string; password: string }) => api.auth.login(v.email, v.password), onSuccess: done }),
    register: useMutation({ mutationFn: (v: { name: string; email: string; password: string }) => api.auth.register(v), onSuccess: done }),
    logout: useMutation({ mutationFn: () => api.auth.logout(), onSuccess: () => { qc.clear(); qc.setQueryData(["me"], null); } }),
    reset: useMutation({ mutationFn: (email: string) => api.auth.requestReset(email) }),
    profile: useMutation({ mutationFn: (name: string) => api.auth.updateProfile({ name }), onSuccess: done }),
    verifyEmail: useMutation({ mutationFn: (token: string) => api.auth.verifyEmail(token), onSuccess: done }),
    resendVerification: useMutation({ mutationFn: () => api.auth.resendVerification() }),
    mfaSetup: useMutation({ mutationFn: () => api.auth.mfaSetup() }),
    mfaVerify: useMutation({ mutationFn: (code: string) => api.auth.mfaVerify(code), onSuccess: done }),
    mfaDisable: useMutation({ mutationFn: (code: string) => api.auth.mfaDisable(code), onSuccess: done }),
  };
}

export const useSaveBusiness = () => useRefreshing((v: BusinessInput) => api.business.save(v));
export const usePublish = () => useRefreshing(() => api.business.publish());
export const useUnpublish = () => useRefreshing(() => api.business.unpublish());
export const useCreateItem = () => useRefreshing((v: CatalogInput) => api.catalog.create(v));
export const useUpdateItem = () => useRefreshing((v: { id: string; input: CatalogInput }) => api.catalog.update(v.id, v.input));
export const useDeleteItem = () => useRefreshing((id: string) => api.catalog.remove(id));
export const useSubmitOrder = () => useRefreshing((v: OrderInput) => api.orders.submit(v));
export const useTransition = () => useRefreshing((v: { id: string; to: OrderStatus }) => api.orders.transition(v.id, v.to));
export const useSetPayment = () => useRefreshing((v: { id: string; status: PaymentStatus }) => api.orders.setPayment(v.id, v.status));
export const useToggleChecklist = () => useRefreshing((v: { key: string; done: boolean }) => api.security.setChecklistItem(v.key, v.done));

// Payment hooks
export const useInitializePayment = () => useRefreshing((v: { orderId: string; method: PaymentMethod; email?: string; callbackUrl?: string }) => api.payments.initialize(v));
export const useVerifyPayment = () => useRefreshing((reference: string) => api.payments.verify(reference));
export const usePayment = (reference: string) => useQuery({ queryKey: ["payment", reference], queryFn: () => api.payments.get(reference), retry: false });
export const usePayments = () => useQuery({ queryKey: ["payments"], queryFn: () => api.payments.list() });
export const usePaymentTransactions = (paymentReference: string) => useQuery({ queryKey: ["paymentTransactions", paymentReference], queryFn: () => api.payments.listTransactions(paymentReference), retry: false });
export const useRefundPayment = () => useRefreshing((v: { paymentId: string; amount: number; reason?: string }) => api.payments.refund(v));
export const useHistory = () => useQuery({ queryKey: ["history"], queryFn: () => api.security.history() });

// Staff hooks
export const useStaff = () => useQuery({ queryKey: ["staff"], queryFn: () => api.staff.list() });
export const useInviteStaff = () => useRefreshing((v: { email: string; role: any }) => api.staff.invite(v));
export const useAcceptStaffInvitation = () => useRefreshing((token: string) => api.staff.accept(token));

// Account hooks
export const useRequestAccountDeletion = () => useRefreshing(() => api.account.requestDeletion());
export const useExportUserData = () => useQuery({ queryKey: ["userDataExport"], queryFn: () => api.account.exportData() });
/** Analysis hooks refresh only the history list (not the whole cache). */
function useAnalysis<T>(fn: (v: string) => Promise<T>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: ["history"] }) });
}
export const useAnalyzeMessage = () => useAnalysis((t) => api.security.analyzeMessage(t));
export const useAnalyzeUrl = () => useAnalysis((u) => api.security.analyzeUrl(u));
export const useClearHistory = () => { const qc = useQueryClient(); return useMutation({ mutationFn: () => api.security.clearHistory(), onSuccess: () => qc.invalidateQueries({ queryKey: ["history"] }) }); };
export const useUploadLogo = () => useRefreshing((f: File) => api.business.uploadLogo(f));
export const useRemoveLogo = () => useRefreshing(() => api.business.removeLogo());
export const useResetDemo = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => api.demo.reset(), onSuccess: () => { qc.clear(); qc.setQueryData(["me"], null); } });
};
