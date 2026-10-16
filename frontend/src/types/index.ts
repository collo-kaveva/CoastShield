export type Category =
  | "FISH_SEAFOOD" | "RETAIL_MARKET" | "FOOD_HOSPITALITY"
  | "CLOTHING_TAILORING" | "REPAIRS_MECHANICS" | "TOURISM" | "OTHER";
export type BusinessStatus = "DRAFT" | "PUBLISHED";

export interface User { 
  id: string; 
  name: string; 
  email: string; 
  role: "OWNER" | "ADMIN" | "STAFF"; 
  emailVerified: boolean;
  mfaEnabled: boolean;
}
export interface OpeningHours { day: string; open: string; close: string; closed: boolean }

/** Owner's full (private) view of a business. */
export interface Business {
  id: string; ownerId: string | null;
  name: string; category: Category; description: string;
  county: string; town: string; publicAddress: string;
  phone: string; whatsapp: string; email: string;
  showPhone: boolean; showEmail: boolean;
  hours: OpeningHours[]; showPrices: boolean;
  slug: string; status: BusinessStatus; logoUrl?: string | null;
  /** True for clearly-labelled sample/demo records. */
  isSample: boolean;
  createdAt: string; updatedAt: string;
}

/** What anonymous visitors may see. Contact fields only appear if the owner chose to show them. */
export interface PublicBusiness {
  id: string; slug: string; name: string; category: Category; description: string;
  county: string; town: string; publicAddress: string;
  phone?: string; whatsapp?: string; email?: string;
  hours: OpeningHours[]; showPrices: boolean; isSample: boolean; logoUrl?: string | null;
}

export interface CatalogItem {
  id: string; businessId: string; name: string; description: string;
  price: number | null; category: string; available: boolean;
  trackStock: boolean; quantity: number | null;
}
export interface PublicItem {
  id: string; name: string; description: string;
  price: number | null; category: string; available: boolean; stockNote?: string;
}
export interface Storefront { business: PublicBusiness; items: PublicItem[]; isPreview: boolean }

export type OrderStatus = "NEW" | "ACCEPTED" | "READY" | "COMPLETED" | "CANCELLED";
export type PaymentStatus = "UNPAID" | "PENDING" | "PAID" | "FAILED";
export type PaymentMethod = "PAYSTACK" | "CASH_ON_DELIVERY" | "MANUAL_MOBILE_MONEY";
export interface OrderLine { itemId: string; name: string; unitPrice: number | null; quantity: number }
export interface HistoryEvent { at: string; label: string }
export interface Order {
  id: string; reference: string; businessId: string;
  customerName: string; customerContact: string; notes: string;
  items: OrderLine[]; status: OrderStatus; paymentStatus: PaymentStatus;
  paymentMethod?: string;
  createdAt: string; updatedAt: string; history: HistoryEvent[]; isSample: boolean;
}

export type PaymentStatusType = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED" | "REFUNDED";
export interface Payment {
  id: string; reference: string; orderId: string;
  method: PaymentMethod; status: PaymentStatusType;
  amount: number; currency: string;
  customerEmail: string; customerName: string;
  metadata: Record<string, unknown>;
  createdAt: string; updatedAt: string;
}

export interface Transaction {
  id: string; paymentId: string; providerReference: string;
  provider: string; status: "PENDING" | "SUCCESS" | "FAILED" | "REVERSED";
  amount: number; currency: string;
  fees: number; commission: number;
  subaccountCode: string;
  verified: boolean; verifiedAt: string | null;
  createdAt: string; updatedAt: string;
}

export interface Refund {
  id: string; reference: string; paymentId: string;
  transactionId: string | null; providerReference: string;
  provider: string; status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  amount: number; currency: string; reason: string;
  initiatedBy: string | null;
  createdAt: string; updatedAt: string;
}

export type StaffRole = "MANAGER" | "SALES" | "INVENTORY" | "VIEWER";
export type StaffStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "DELETED";
export interface Staff {
  id: string;
  userEmail: string;
  userName: string;
  role: StaffRole;
  status: StaffStatus;
  invitedByName: string;
  invitedAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface UserDataExport {
  user: { id: string; email: string; name: string; role: string; dateJoined: string };
  business: { id: string; name: string; category: string; description: string; county: string; town: string; phone: string; whatsapp: string; email: string; createdAt: string } | null;
  staffAssignments: Array<{ id: string; business: string; role: string; status: string; invitedAt: string }>;
  orders: any[];
}

/** What a customer may see about their own request: status and item names only, never other people's data. */
export interface OrderLookupResult {
  reference: string; businessName: string; status: OrderStatus; createdAt: string; updatedAt: string; items: { name: string; quantity: number }[];
}
export interface AuditEvent {
  id: string; action: string; actorId: string | null; targetType: string; targetId: string; metadata: Record<string, unknown>; createdAt: string;
}
export interface AuditPage { count: number; page: number; hasNext: boolean; hasPrevious: boolean; results: AuditEvent[] }

export type RiskLevel = "LOW" | "CAUTION" | "HIGH";
export type Severity = "low" | "medium" | "high";
export interface Indicator { id: string; label: string; severity: Severity; explanation: string; matched?: string }
export interface AnalysisResult {
  risk: RiskLevel; indicators: Indicator[]; summary: string;
  recommendations: string[]; disclaimer: string;
}
export interface UrlAnalysis extends AnalysisResult {
  valid: boolean; normalizedUrl: string | null; hostname: string | null;
}
export interface MessageAnalysis extends AnalysisResult { urlsFound: string[] }

/** A past check. Only the outcome is kept; the text that was checked is never stored. */
export interface AnalysisHistoryItem {
  id: string; kind: "MESSAGE" | "URL"; risk: RiskLevel;
  indicators: { id: string; label: string; severity: Severity }[]; createdAt: string;
}

export interface ChecklistItem { key: string; group: string; title: string; description: string; done: boolean }
export interface IncidentStep { title: string; detail: string }
export interface IncidentGuide {
  id: string; title: string; summary: string; steps: IncidentStep[];
}

export interface DashboardSummary {
  business: Business | null;
  completion: { percent: number; missing: string[] };
  itemCount: number; newOrders: number; outstandingOrders: number;
  recentOrders: Order[];
  checklist: { done: number; total: number };
  analytics: {
    totalRevenue: number;
    thisMonthRevenue: number;
    revenueByMonth: Array<{ month: string; revenue: number }>;
  };
}
