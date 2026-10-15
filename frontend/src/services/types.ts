import type {
  AnalysisHistoryItem, AuditPage, Business, CatalogItem, ChecklistItem, DashboardSummary, IncidentGuide, MessageAnalysis, Order,
  OrderLookupResult, OrderStatus, PaymentStatus, PublicBusiness, Storefront, UrlAnalysis, User, Category, OpeningHours,
} from "@/types";

export interface BusinessInput {
  name: string; category: Category; description: string; county: string; town: string; publicAddress: string;
  phone: string; whatsapp: string; email: string; showPhone: boolean; showEmail: boolean;
  hours: OpeningHours[]; showPrices: boolean;
}
export interface CatalogInput {
  name: string; description: string; price: number | null; category: string;
  available: boolean; trackStock: boolean; quantity: number | null;
}
export interface OrderInput {
  slug: string; customerName: string; customerContact: string; notes: string;
  items: { itemId: string; quantity: number }[];
}
export interface OrderReceipt { reference: string; businessName: string; createdAt: string }

/**
 * The single contract between UI and data. Phase 1 implements it with a browser-only
 * mock (services/mock). Phase 2 adds an HTTP implementation with the same shape;
 * no component imports the mock directly.
 */
export interface Api {
  auth: {
    me(): Promise<User | null>;
    login(email: string, password: string): Promise<User>;
    register(input: { name: string; email: string; password: string }): Promise<User>;
    logout(): Promise<void>;
    requestReset(email: string): Promise<void>;
    updateProfile(input: { name: string }): Promise<User>;
  };
  business: {
    get(): Promise<Business | null>;
    save(input: BusinessInput): Promise<Business>;
    publish(): Promise<Business>;
    unpublish(): Promise<Business>;
    /** Real backend only: validated, re-encoded and stored server-side. */
    uploadLogo(file: File): Promise<Business>;
    removeLogo(): Promise<Business>;
  };
  catalog: {
    list(): Promise<CatalogItem[]>;
    create(input: CatalogInput): Promise<CatalogItem>;
    update(id: string, input: CatalogInput): Promise<CatalogItem>;
    remove(id: string): Promise<void>;
  };
  storefront: {
    get(slug: string, opts?: { preview?: boolean }): Promise<Storefront>;
    list(filter?: { category?: Category | "ALL"; q?: string }): Promise<PublicBusiness[]>;
  };
  orders: {
    submit(input: OrderInput): Promise<OrderReceipt>;
    list(): Promise<Order[]>;
    get(id: string): Promise<Order>;
    transition(id: string, to: OrderStatus): Promise<Order>;
    setPayment(id: string, status: PaymentStatus): Promise<Order>;
    /** Customer-facing: needs the reference AND the contact used. Any mismatch looks like "not found". */
    lookup(reference: string, contact: string): Promise<OrderLookupResult>;
  };
  security: {
    analyzeMessage(text: string): Promise<MessageAnalysis>;
    analyzeUrl(url: string): Promise<UrlAnalysis>;
    checklist(): Promise<ChecklistItem[]>;
    setChecklistItem(key: string, done: boolean): Promise<ChecklistItem[]>;
    incidents(): Promise<IncidentGuide[]>;
    history(): Promise<AnalysisHistoryItem[]>;
    clearHistory(): Promise<void>;
  };
  dashboard: { summary(): Promise<DashboardSummary> };
  /** Administrators only (enforced by the backend). Not available in demo mode. */
  admin: { auditEvents(opts: { action?: string; page?: number }): Promise<AuditPage> };
  demo: { reset(): Promise<void> };
}
