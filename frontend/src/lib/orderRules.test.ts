import { describe, expect, it } from "vitest";
import { canTransition, orderTotal, TRANSITIONS } from "./orderRules";

describe("order status rules", () => {
  it("follows NEW → ACCEPTED → READY → COMPLETED", () => {
    expect(canTransition("NEW", "ACCEPTED")).toBe(true);
    expect(canTransition("ACCEPTED", "READY")).toBe(true);
    expect(canTransition("READY", "COMPLETED")).toBe(true);
  });
  it("blocks skipping and going backwards", () => {
    expect(canTransition("NEW", "COMPLETED")).toBe(false);
    expect(canTransition("NEW", "READY")).toBe(false);
    expect(canTransition("READY", "ACCEPTED")).toBe(false);
  });
  it("makes COMPLETED and CANCELLED final", () => {
    expect(TRANSITIONS.COMPLETED).toEqual([]);
    expect(TRANSITIONS.CANCELLED).toEqual([]);
  });
  it("allows cancelling before completion only", () => {
    expect(canTransition("READY", "CANCELLED")).toBe(true);
    expect(canTransition("COMPLETED", "CANCELLED")).toBe(false);
  });
  it("totals priced lines and reports unpriced ones", () => {
    expect(orderTotal([{ unitPrice: 100, quantity: 2 }, { unitPrice: null, quantity: 1 }])).toEqual({ total: 200, hasUnpriced: true });
  });
});
