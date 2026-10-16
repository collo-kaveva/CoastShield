/** Real implementation of the Api contract, talking to the Django REST backend. */
import type { Api } from "../types";
import { ApiError } from "../errors";
import { fetchAll, request } from "./client";
import type { AnalysisHistoryItem, AuditEvent, OrderLookupResult, Business, IncidentGuide, MessageAnalysis, UrlAnalysis, CatalogItem, ChecklistItem, DashboardSummary, Order, PublicBusiness, Storefront, User, Payment, Transaction, Refund } from "@/types";

export const httpApi: Api = {
  auth: {
    me: async () => (await request<{ user: User | null }>("GET", "/auth/me/")).user,
    login: (email, password) => request<User>("POST", "/auth/login/", { email, password }),
    register: (input) => request<User>("POST", "/auth/register/", input),
    logout: async () => { await request<void>("POST", "/auth/logout/"); },
    requestReset: async (email) => { await request<void>("POST", "/auth/password-reset/", { email }); },
    updateProfile: async (input) => (await request<{ user: User }>("PATCH", "/auth/me/", input)).user,
  },
  business: {
    get: async () => {
      try { return await request<Business>("GET", "/business/me/"); }
      catch (e) { if (e instanceof ApiError && e.status === 404) return null; throw e; }
    },
    save: (input) => request<Business>("PUT", "/business/me/", input),
    publish: () => request<Business>("POST", "/business/me/publish/"),
    unpublish: () => request<Business>("POST", "/business/me/unpublish/"),
    uploadLogo: (file) => { const f = new FormData(); f.append("logo", file); return request<Business>("POST", "/business/me/logo/", f); },
    removeLogo: () => request<Business>("DELETE", "/business/me/logo/"),
  },
  catalog: {
    list: () => fetchAll<CatalogItem>("/catalog/items/"),
    create: (input) => request<CatalogItem>("POST", "/catalog/items/", input),
    update: (id, input) => request<CatalogItem>("PUT", `/catalog/items/${id}/`, input),
    remove: async (id) => { await request<void>("DELETE", `/catalog/items/${id}/`); },
  },
  storefront: {
    get: (slug, opts) => request<Storefront>("GET", `/storefronts/${encodeURIComponent(slug)}/${opts?.preview ? "?preview=1" : ""}`),
    list: (filter) => {
      const p = new URLSearchParams();
      if (filter?.category && filter.category !== "ALL") p.set("category", filter.category);
      if (filter?.q?.trim()) p.set("q", filter.q.trim());
      return fetchAll<PublicBusiness>(`/storefronts/${p.toString() ? `?${p}` : ""}`);
    },
  },
  orders: {
    submit: ({ slug, ...body }) => request("POST", `/storefronts/${encodeURIComponent(slug)}/orders/`, body),
    list: () => fetchAll<Order>("/orders/"),
    get: (id) => request<Order>("GET", `/orders/${id}/`),
    transition: (id, to) => request<Order>("POST", `/orders/${id}/transition/`, { to }),
    setPayment: (id, status) => request<Order>("POST", `/orders/${id}/payment/`, { status }),
    lookup: (reference, contact) => request<OrderLookupResult>("POST", "/orders/lookup/", { reference, contact }),
  },
  security: {
    // Authoritative analysis runs on the server. The text is analysed in memory there and never stored.
    analyzeMessage: (text) => request<MessageAnalysis>("POST", "/security/analyze-message/", { text }),
    analyzeUrl: (url) => request<UrlAnalysis>("POST", "/security/check-url/", { url }),
    checklist: () => request<ChecklistItem[]>("GET", "/security/checklist/"),
    setChecklistItem: (key, done) => request<ChecklistItem[]>("PUT", `/security/checklist/${encodeURIComponent(key)}/`, { done }),
    incidents: () => request<IncidentGuide[]>("GET", "/security/incidents/"),
    history: () => fetchAll<AnalysisHistoryItem>("/security/analyses/"),
    clearHistory: async () => { await request<void>("DELETE", "/security/analyses/"); },
  },
  dashboard: { summary: () => request<DashboardSummary>("GET", "/dashboard/summary/") },
  payments: {
    initialize: (input) => request("POST", "/payments/initialize/", input),
    verify: (reference) => request("POST", "/payments/verify/", { reference }),
    get: (reference) => request<Payment>("GET", `/payments/${reference}/`),
    list: () => fetchAll<Payment>("/payments/list/"),
    listTransactions: (paymentReference) => fetchAll<Transaction>(`/payments/${paymentReference}/transactions/`),
    refund: (input) => request<Refund>("POST", "/payments/refund/", input),
  },
  admin: {
    auditEvents: async ({ action, page = 1 }) => {
      const p = new URLSearchParams({ page: String(page), page_size: "25" });
      if (action) p.set("action", action);
      const r = await request<{ count: number; next: string | null; previous: string | null; results: AuditEvent[] }>("GET", `/audit/events/?${p}`);
      return { count: r.count, page, hasNext: !!r.next, hasPrevious: !!r.previous, results: r.results };
    },
  },
  demo: { reset: async () => { throw new ApiError("Resetting is only available in demo mode.", 400); } },
};
