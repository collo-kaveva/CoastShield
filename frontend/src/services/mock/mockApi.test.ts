import { beforeEach, describe, expect, it } from "vitest";
import { mockApi as api } from "./mockApi";
import { resetState } from "./db";
import { defaultHours } from "@/lib/hours";
import type { BusinessInput } from "../types";

const biz: BusinessInput = {
  name: "Test Tailor", category: "CLOTHING_TAILORING", description: "Custom clothes and alterations.", county: "Mombasa", town: "Likoni",
  publicAddress: "", phone: "0700 111 222", whatsapp: "", email: "", showPhone: true, showEmail: false, hours: defaultHours(), showPrices: true,
};
const item = { name: "Hem", description: "", price: 150, category: "Alterations", available: true, trackStock: false, quantity: null };

beforeEach(() => resetState());

async function newOwner(email = "owner@example.com") {
  await api.auth.register({ name: "Test Owner", email, password: "password123" });
  await api.business.save(biz);
}

describe("auth (demo)", () => {
  it("registers, logs out, logs back in", async () => {
    const u = await api.auth.register({ name: "Asha", email: "Asha@Example.com", password: "password123" });
    expect(u.email).toBe("asha@example.com");
    expect(JSON.stringify(u)).not.toMatch(/password/);
    await api.auth.logout();
    expect(await api.auth.me()).toBeNull();
    expect((await api.auth.login("asha@example.com", "password123")).id).toBe(u.id);
  });
  it("rejects bad credentials with a generic message", async () => {
    await expect(api.auth.login("nobody@example.com", "password123")).rejects.toThrow("Incorrect email or password.");
    await expect(api.auth.login("fatuma@example.com", "short")).rejects.toThrow("Incorrect email or password.");
  });
  it("validates registration input", async () => {
    await expect(api.auth.register({ name: "A", email: "bad", password: "123" })).rejects.toMatchObject({ status: 422 });
  });
});

describe("authorization", () => {
  it("blocks private endpoints when signed out", async () => {
    await expect(api.orders.list()).rejects.toMatchObject({ status: 401 });
    await expect(api.catalog.list()).rejects.toMatchObject({ status: 401 });
    await expect(api.security.checklist()).rejects.toMatchObject({ status: 401 });
  });
  it("does not let one owner read or change another owner's order", async () => {
    await api.auth.login("fatuma@example.com", "password123");
    const orders = await api.orders.list();
    expect(orders.length).toBeGreaterThan(0);
    await api.auth.logout();
    await newOwner();
    await expect(api.orders.get(orders[0].id)).rejects.toMatchObject({ status: 404 });
    await expect(api.orders.transition(orders[0].id, "ACCEPTED")).rejects.toMatchObject({ status: 404 });
    await expect(api.orders.setPayment(orders[0].id, "PAID")).rejects.toMatchObject({ status: 404 });
    expect(await api.orders.list()).toHaveLength(0);
  });
  it("does not let an owner edit another owner's catalog item", async () => {
    await api.auth.login("fatuma@example.com", "password123");
    const [first] = await api.catalog.list();
    await api.auth.logout();
    await newOwner();
    await expect(api.catalog.update(first.id, item)).rejects.toMatchObject({ status: 404 });
    await expect(api.catalog.remove(first.id)).rejects.toMatchObject({ status: 404 });
  });
  it("isolates checklist progress per account", async () => {
    await api.auth.login("fatuma@example.com", "password123");
    const before = (await api.security.checklist()).filter((c) => c.done).length;
    await api.auth.logout();
    await newOwner();
    expect((await api.security.checklist()).filter((c) => c.done)).toHaveLength(0);
    await api.security.setChecklistItem("mfa-on", true);
    await api.auth.logout();
    await api.auth.login("fatuma@example.com", "password123");
    expect((await api.security.checklist()).filter((c) => c.done)).toHaveLength(before);
  });
});

describe("storefront visibility", () => {
  it("hides drafts from anonymous visitors and shows them to the owner in preview only", async () => {
    await newOwner();
    const b = (await api.business.get())!;
    await expect(api.storefront.get(b.slug)).rejects.toMatchObject({ status: 404 });
    expect((await api.storefront.get(b.slug, { preview: true })).isPreview).toBe(true);
    await api.auth.logout();
    await expect(api.storefront.get(b.slug, { preview: true })).rejects.toMatchObject({ status: 404 });
    expect((await api.storefront.list()).some((x) => x.slug === b.slug)).toBe(false);
  });
  it("refuses to publish an incomplete profile and lists what is missing", async () => {
    await api.auth.register({ name: "Asha", email: "asha@example.com", password: "password123" });
    await api.business.save({ ...biz, description: "", phone: "" });
    await expect(api.business.publish()).rejects.toThrow(/description.*contact/i);
  });
  it("publishes, exposes only opted-in contact details and unpublishes", async () => {
    await api.auth.register({ name: "Asha", email: "asha@example.com", password: "password123" });
    await api.business.save({ ...biz, email: "private@example.com", showEmail: false });
    await api.business.publish();
    await api.auth.logout();
    const sf = await api.storefront.get("test-tailor");
    expect(sf.business.phone).toBe("0700 111 222");
    expect(sf.business.email).toBeUndefined();
    await api.auth.login("asha@example.com", "password123");
    await api.business.unpublish();
    await api.auth.logout();
    await expect(api.storefront.get("test-tailor")).rejects.toMatchObject({ status: 404 });
  });
  it("hides prices when the owner chooses", async () => {
    await api.auth.register({ name: "Asha", email: "asha@example.com", password: "password123" });
    await api.business.save({ ...biz, showPrices: false });
    await api.catalog.create(item);
    await api.business.publish();
    expect((await api.storefront.get("test-tailor")).items[0].price).toBeNull();
  });
  it("gives unique, stable slugs", async () => {
    await api.auth.register({ name: "Asha", email: "a1@example.com", password: "password123" });
    const a = await api.business.save({ ...biz, name: "Bandari Fresh Fish" });
    expect(a.slug).toBe("bandari-fresh-fish-2");
    const renamed = await api.business.save({ ...biz, name: "Totally New Name" });
    expect(renamed.slug).toBe("bandari-fresh-fish-2");
  });
});

describe("catalog validation", () => {
  it("rejects negative prices, bad quantities and short names", async () => {
    await newOwner();
    await expect(api.catalog.create({ ...item, price: -5 })).rejects.toMatchObject({ status: 422 });
    await expect(api.catalog.create({ ...item, trackStock: true, quantity: -1 })).rejects.toMatchObject({ status: 422 });
    await expect(api.catalog.create({ ...item, trackStock: true, quantity: 1.5 })).rejects.toMatchObject({ status: 422 });
    await expect(api.catalog.create({ ...item, name: "x" })).rejects.toMatchObject({ status: 422 });
  });
});

describe("orders", () => {
  const order = { slug: "mama-fatuma-fresh-catch", customerName: "Test Customer", customerContact: "0700 999 888", notes: "", items: [{ itemId: "i_tilapia", quantity: 2 }] };

  it("accepts a valid request, returns only a reference, and snapshots server-side prices", async () => {
    const receipt = await api.orders.submit(order);
    expect(receipt.reference).toMatch(/^CS-[2-9A-HJKMNP-Z]{6}$/);
    expect(Object.keys(receipt).sort()).toEqual(["businessName", "createdAt", "reference"]);
    await api.auth.login("fatuma@example.com", "password123");
    const mine = (await api.orders.list()).find((o) => o.reference === receipt.reference)!;
    expect(mine.status).toBe("NEW");
    expect(mine.paymentStatus).toBe("UNPAID");
    expect(mine.items[0].unitPrice).toBe(450);
  });
  it("rejects invalid quantities", async () => {
    for (const quantity of [0, -1, 1.5, 100, NaN]) await expect(api.orders.submit({ ...order, items: [{ itemId: "i_tilapia", quantity }] })).rejects.toMatchObject({ status: 422 });
  });
  it("rejects unavailable items, foreign item ids, duplicates and over-stock quantities", async () => {
    await expect(api.orders.submit({ ...order, items: [{ itemId: "i_plate", quantity: 1 }] })).rejects.toThrow(/unavailable/i);
    await expect(api.orders.submit({ ...order, items: [{ itemId: "bandari-fresh-fish_0", quantity: 1 }] })).rejects.toThrow(/not available from this business/i);
    await expect(api.orders.submit({ ...order, items: [{ itemId: "i_tilapia", quantity: 1 }, { itemId: "i_tilapia", quantity: 1 }] })).rejects.toMatchObject({ status: 422 });
    await expect(api.orders.submit({ ...order, items: [{ itemId: "i_kingfish", quantity: 5 }] })).rejects.toThrow(/only 4/i);
  });
  it("validates customer details and requires a note for item-less enquiries", async () => {
    await expect(api.orders.submit({ ...order, customerName: "" })).rejects.toMatchObject({ fields: { customerName: expect.any(String) } });
    await expect(api.orders.submit({ ...order, customerContact: "hello" })).rejects.toMatchObject({ fields: { customerContact: expect.any(String) } });
    await expect(api.orders.submit({ ...order, items: [], notes: "" })).rejects.toMatchObject({ fields: { notes: expect.any(String) } });
    await expect(api.orders.submit({ ...order, items: [], notes: "Do you deliver to Nyali?" })).resolves.toBeTruthy();
  });
  it("blocks rapid duplicate submissions", async () => {
    await api.orders.submit(order);
    await expect(api.orders.submit(order)).rejects.toMatchObject({ status: 409 });
  });
  it("404s for unpublished or unknown storefronts", async () => {
    await expect(api.orders.submit({ ...order, slug: "nope" })).rejects.toMatchObject({ status: 404 });
  });
  it("lets the owner move an order through the workflow and records history", async () => {
    await api.auth.login("fatuma@example.com", "password123");
    const { id } = (await api.orders.list()).find((o) => o.status === "NEW")!;
    await expect(api.orders.transition(id, "COMPLETED")).rejects.toMatchObject({ status: 409 });
    await api.orders.transition(id, "ACCEPTED");
    await api.orders.transition(id, "READY");
    const done = await api.orders.transition(id, "COMPLETED");
    expect(done.history.map((h) => h.label)).toEqual(expect.arrayContaining(["Status changed to Accepted", "Status changed to Ready", "Status changed to Completed"]));
    await expect(api.orders.transition(id, "CANCELLED")).rejects.toMatchObject({ status: 409 });
  });
  it("records payment manually, never from customer input", async () => {
    const receipt = await api.orders.submit(order);
    await api.auth.login("fatuma@example.com", "password123");
    const o = (await api.orders.list()).find((x) => x.reference === receipt.reference)!;
    expect(o.paymentStatus).toBe("UNPAID");
    expect((await api.orders.setPayment(o.id, "PAID")).history.at(-1)?.label).toMatch(/recorded manually/i);
  });
});

describe("security service", () => {
  it("analyses without storing the message and rejects empty input", async () => {
    await api.auth.login("fatuma@example.com", "password123");
    await expect(api.security.analyzeMessage("")).rejects.toMatchObject({ status: 422 });
    const r = await api.security.analyzeMessage("Send your PIN urgently");
    expect(r.indicators.length).toBeGreaterThan(0);
    expect(localStorage.getItem("coastshield.demo.v1")).not.toMatch(/Send your PIN urgently/);
  });
  it("rejects unknown checklist keys", async () => {
    await api.auth.login("fatuma@example.com", "password123");
    await expect(api.security.setChecklistItem("nope", true)).rejects.toMatchObject({ status: 404 });
  });
});
