import type {
  AnalysisHistoryItem, AuditPage, Business, CatalogItem, ChecklistItem, DashboardSummary, IncidentGuide, MessageAnalysis, Order,
  OrderLookupResult, OrderStatus, PaymentStatus, PublicBusiness, Storefront, UrlAnalysis, User, Category, OpeningHours,
  RiskLevel, Severity, Indicator, AnalysisResult, StaffRole, StaffStatus, Staff, UserDataExport, PaymentMethod, Payment, Transaction, Refund
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
    verifyEmail(token: string): Promise<User>;
    resendVerification(): Promise<void>;
    mfaSetup(): Promise<{ secret: string; qr_code: string; backup_codes: string[] }>;
    mfaVerify(code: string): Promise<User>;
    mfaDisable(code: string): Promise<User>;
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
  payments: {
    initialize(input: { orderId: string; method: PaymentMethod; email?: string; callbackUrl?: string }): Promise<{
      paymentReference: string;
      authorizationUrl?: string;
      accessCode?: string;
      reference?: string;
      status: string;
      message?: string;
    }>;
    verify(reference: string): Promise<{
      status: string;
      paymentReference: string;
      orderReference: string;
      amount: string;
      paymentStatus: string;
    }>;
    get(reference: string): Promise<Payment>;
    list(): Promise<Payment[]>;
    listTransactions(paymentReference: string): Promise<Transaction[]>;
    refund(input: { paymentId: string; amount: number; reason?: string }): Promise<Refund>;
  };
  staff: {
    list(): Promise<Staff[]>;
    invite(input: { email: string; role: StaffRole }): Promise<Staff>;
    accept(token: string): Promise<Staff>;
  };
  account: {
    requestDeletion(): Promise<void>;
    exportData(): Promise<UserDataExport>;
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
