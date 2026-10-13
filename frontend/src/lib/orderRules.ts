import type { OrderStatus } from "@/types";

/**
 * Allowed status transitions. The UI uses this only to hide invalid actions;
 * the backend (Phase 2) must enforce exactly the same table.
 */
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const canTransition = (from: OrderStatus, to: OrderStatus) => TRANSITIONS[from].includes(to);

export const STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: "New", ACCEPTED: "Accepted", READY: "Ready", COMPLETED: "Completed", CANCELLED: "Cancelled",
};

export const STATUS_ACTION: Record<OrderStatus, string> = {
  NEW: "Reopen", ACCEPTED: "Accept request", READY: "Mark as ready", COMPLETED: "Mark completed", CANCELLED: "Cancel request",
};

export const orderTotal = (lines: { unitPrice: number | null; quantity: number }[]) => {
  const priced = lines.filter((l) => l.unitPrice !== null);
  return { total: priced.reduce((s, l) => s + (l.unitPrice as number) * l.quantity, 0), hasUnpriced: priced.length !== lines.length };
};
