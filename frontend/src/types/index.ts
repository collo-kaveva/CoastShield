export type Category =
  | "FISH_SEAFOOD" | "RETAIL_MARKET" | "FOOD_HOSPITALITY"
  | "CLOTHING_TAILORING" | "REPAIRS_MECHANICS" | "TOURISM" | "OTHER";
export type BusinessStatus = "DRAFT" | "PUBLISHED";

export interface User { id: string; name: string; email: string }
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
export type PaymentStatus = "UNPAID" | "PAID";
export interface OrderLine { itemId: string; name: string; unitPrice: number | null; quantity: number }
export interface HistoryEvent { at: string; label: string }
export interface Order {
  id: string; reference: string; businessId: string;
  customerName: string; customerContact: string; notes: string;
  items: OrderLine[]; status: OrderStatus; paymentStatus: PaymentStatus;
  createdAt: string; updatedAt: string; history: HistoryEvent[]; isSample: boolean;
}

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
}
