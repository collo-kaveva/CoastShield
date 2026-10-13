/**
 * Browser-only DEMO implementation of the Api contract.
 * Not secure: there is no real authentication or server. It exists so the UI is fully
 * interactive in Phase 1 and mirrors the rules the Django backend must enforce in Phase 2.
 */
import type { Api, BusinessInput, CatalogInput, OrderInput } from "../types";
import { ApiError } from "../errors";
import { getState, mutate, resetState } from "./db";
import { SAMPLE_BUSINESSES, type DemoState } from "./seed";
import { delay, slugify, uid } from "@/lib/utils";
import { toPublicBusiness, toPublicItem } from "@/lib/public";
import { TRANSITIONS, STATUS_LABEL } from "@/lib/orderRules";
import { CATEGORIES } from "@/lib/categories";
import { analyzeMessage, analyzeUrl, validateMessage } from "../security/analyzer";
import { CHECKLIST_DEFS, INCIDENT_GUIDES } from "../security/content";
import type { Business, CatalogItem, ChecklistItem, Order, OrderStatus, PublicItem, User } from "@/types";

const wait = () => delay(import.meta.env.MODE === "test" ? 0 : 220);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s-]{7,14}$/;

const currentUser = (s: DemoState): User | null => s.users.find((u) => u.id === s.sessionUserId) ?? null;
function requireUser(s: DemoState): User {
  const u = currentUser(s);
  if (!u) throw new ApiError("Please sign in to continue.", 401);
  return u;
}
const ownBusiness = (s: DemoState, u: User) => s.businesses.find((b) => b.ownerId === u.id) ?? null;
function requireBusiness(s: DemoState, u: User): Business {
  const b = ownBusiness(s, u);
  if (!b) throw new ApiError("Create your business profile first.", 404);
  return b;
}

function validateBusiness(i: BusinessInput) {
  const f: Record<string, string> = {};
  if (i.name.trim().length < 2) f.name = "Enter your business name.";
  if (!CATEGORIES.some((c) => c.value === i.category)) f.category = "Choose a category.";
  if (i.email && !EMAIL_RE.test(i.email)) f.email = "Enter a valid email address.";
  if (i.phone && !PHONE_RE.test(i.phone)) f.phone = "Enter a valid phone number.";
  if (Object.keys(f).length) throw new ApiError("Please fix the highlighted fields.", 422, f);
}

function validateItem(i: CatalogInput) {
  const f: Record<string, string> = {};
  if (i.name.trim().length < 2) f.name = "Enter a name.";
  if (i.price !== null && (!Number.isFinite(i.price) || i.price < 0 || i.price > 10_000_000)) f.price = "Enter a price between 0 and 10,000,000.";
  if (i.trackStock && (i.quantity === null || !Number.isInteger(i.quantity) || i.quantity < 0)) f.quantity = "Enter a whole number of 0 or more.";
  if (Object.keys(f).length) throw new ApiError("Please fix the highlighted fields.", 422, f);
}

export function missingForPublish(b: Pick<Business, "name" | "description" | "county" | "town" | "phone" | "whatsapp" | "email">) {
  const m: string[] = [];
  if (!b.name.trim()) m.push("business name");
  if (b.description.trim().length < 10) m.push("a short description");
  if (!b.county.trim() || !b.town.trim()) m.push("county and town");
  if (!b.phone && !b.whatsapp && !b.email) m.push("a way for customers to contact you");
  return m;
}

function uniqueSlug(s: DemoState, name: string) {
  const base = slugify(name);
  const taken = new Set([...s.businesses.map((b) => b.slug), ...SAMPLE_BUSINESSES.map((x) => x.business.slug)]);
  let slug = base, n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;
  return slug;
}

const REF_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function newReference(s: DemoState) {
  for (;;) {
    let r = "CS-";
    for (let i = 0; i < 6; i++) r += REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)];
    if (!s.orders.some((o) => o.reference === r)) return r;
  }
}

function checklistFor(s: DemoState, u: User): ChecklistItem[] {
  const done = new Set(s.checklist[u.id] ?? []);
  return CHECKLIST_DEFS.map((d) => ({ ...d, done: done.has(d.key) }));
}

function completion(s: DemoState, b: Business | null) {
  if (!b) return { percent: 0, missing: ["business profile"] };
  const checks: [boolean, string][] = [
    [b.name.trim().length > 1, "business name"], [b.description.trim().length >= 10, "description"],
    [!!b.county && !!b.town, "location"], [!!(b.phone || b.whatsapp || b.email), "contact details"],
    [b.hours.some((h) => !h.closed), "opening hours"], [s.items.some((i) => i.businessId === b.id), "at least one product or service"],
  ];
  return { percent: Math.round((checks.filter(([ok]) => ok).length / checks.length) * 100), missing: checks.filter(([ok]) => !ok).map(([, l]) => l) };
}

function resolveStore(s: DemoState, slug: string): { id: string; name: string; items: { id: string; name: string; price: number | null; available: boolean; qty: number | null }[]; ownerless: boolean } {
  const sample = SAMPLE_BUSINESSES.find((x) => x.business.slug === slug);
  if (sample) return { id: sample.business.id, name: sample.business.name, ownerless: true, items: sample.items.map((i) => ({ id: i.id, name: i.name, price: i.price, available: i.available, qty: null })) };
  const b = s.businesses.find((x) => x.slug === slug && x.status === "PUBLISHED");
  if (!b) throw new ApiError("This storefront is not available.", 404);
  return { id: b.id, name: b.name, ownerless: false, items: s.items.filter((i) => i.businessId === b.id).map((i) => ({ id: i.id, name: i.name, price: i.price, available: i.available && !(i.trackStock && i.quantity === 0), qty: i.trackStock ? i.quantity : null })) };
}

const ownOrder = (s: DemoState, u: User, id: string): Order => {
  const b = ownBusiness(s, u);
  const o = s.orders.find((x) => x.id === id && b && x.businessId === b.id);
  if (!o) throw new ApiError("Order not found.", 404); // same error whether missing or not yours
  return o;
};

/** Records the outcome of a check (never its text) for the signed-in user. */
function remember<T extends { risk: "LOW" | "CAUTION" | "HIGH"; indicators: { id: string; label: string; severity: "low" | "medium" | "high" }[] }>(kind: "MESSAGE" | "URL", result: T): T {
  const s = getState(); const u = currentUser(s);
  if (u) mutate((st) => { (st.analyses ??= []).push({ id: uid("a"), userId: u.id, kind, risk: result.risk, indicators: result.indicators.map(({ id, label, severity }) => ({ id, label, severity })), createdAt: new Date().toISOString() }); st.analyses = st.analyses.slice(-100); });
  return result;
}

export const mockApi: Api = {
  auth: {
    async me() { await wait(); return currentUser(getState()); },
    async login(email, password) {
      await wait();
      const s = getState();
      const user = s.users.find((u) => u.email === email.trim().toLowerCase());
      if (!user || password.length < 8) throw new ApiError("Incorrect email or password.", 401);
      mutate((st) => { st.sessionUserId = user.id; });
      return user;
    },
    async register({ name, email, password }) {
      await wait();
      const f: Record<string, string> = {};
      const e = email.trim().toLowerCase();
      if (name.trim().length < 2) f.name = "Enter your name.";
      if (!EMAIL_RE.test(e)) f.email = "Enter a valid email address.";
      if (password.length < 8) f.password = "Use at least 8 characters.";
      if (getState().users.some((u) => u.email === e)) f.email = "An account with this email already exists in this demo.";
      if (Object.keys(f).length) throw new ApiError("Please fix the highlighted fields.", 422, f);
      return mutate((st) => {
        const user: User = { id: uid("u"), name: name.trim(), email: e };
        st.users.push(user); st.sessionUserId = user.id; // password is deliberately never stored in demo mode
        return user;
      });
    },
    async logout() { await wait(); mutate((s) => { s.sessionUserId = null; }); },
    async requestReset() { await wait(); /* always succeeds: no account enumeration, no email sent in demo */ },
    async updateProfile({ name }) {
      await wait();
      if (name.trim().length < 2) throw new ApiError("Enter your name.", 422, { name: "Enter your name." });
      return mutate((s) => { const u = requireUser(s); u.name = name.trim(); return u; });
    },
  },

  business: {
    async get() { await wait(); const s = getState(); return ownBusiness(s, requireUser(s)); },
    async save(input) {
      await wait();
      validateBusiness(input);
      return mutate((s) => {
        const u = requireUser(s);
        const now = new Date().toISOString();
        let b = ownBusiness(s, u);
        if (!b) {
          b = { id: uid("b"), ownerId: u.id, ...input, slug: uniqueSlug(s, input.name), status: "DRAFT", isSample: false, createdAt: now, updatedAt: now };
          s.businesses.push(b);
        } else Object.assign(b, input, { updatedAt: now });
        return b;
      });
    },
    async publish() {
      await wait();
      return mutate((s) => {
        const b = requireBusiness(s, requireUser(s));
        const missing = missingForPublish(b);
        if (missing.length) throw new ApiError(`Add ${missing.join(", ")} before publishing.`, 422);
        b.status = "PUBLISHED"; b.updatedAt = new Date().toISOString();
        return b;
      });
    },
    async uploadLogo() { throw new ApiError("Logo upload needs the real backend (API mode).", 400); },
    async removeLogo() { throw new ApiError("Logo upload needs the real backend (API mode).", 400); },
    async unpublish() {
      await wait();
      return mutate((s) => { const b = requireBusiness(s, requireUser(s)); b.status = "DRAFT"; b.updatedAt = new Date().toISOString(); return b; });
    },
  },

  catalog: {
    async list() { await wait(); const s = getState(); const b = ownBusiness(s, requireUser(s)); return b ? s.items.filter((i) => i.businessId === b.id) : []; },
    async create(input) {
      await wait(); validateItem(input);
      return mutate((s) => { const b = requireBusiness(s, requireUser(s)); const it: CatalogItem = { id: uid("i"), businessId: b.id, ...input, name: input.name.trim(), quantity: input.trackStock ? input.quantity : null }; s.items.push(it); return it; });
    },
    async update(id, input) {
      await wait(); validateItem(input);
      return mutate((s) => {
        const b = requireBusiness(s, requireUser(s));
        const it = s.items.find((x) => x.id === id && x.businessId === b.id);
        if (!it) throw new ApiError("Item not found.", 404);
        Object.assign(it, input, { name: input.name.trim(), quantity: input.trackStock ? input.quantity : null });
        return it;
      });
    },
    async remove(id) {
      await wait();
      mutate((s) => {
        const b = requireBusiness(s, requireUser(s));
        const idx = s.items.findIndex((x) => x.id === id && x.businessId === b.id);
        if (idx < 0) throw new ApiError("Item not found.", 404);
        s.items.splice(idx, 1);
      });
    },
  },

  storefront: {
    async get(slug, opts) {
      await wait();
      const s = getState();
      const sample = SAMPLE_BUSINESSES.find((x) => x.business.slug === slug);
      if (sample) return { business: sample.business, items: sample.items, isPreview: false };
      const b = s.businesses.find((x) => x.slug === slug);
      const u = currentUser(s);
      const isOwner = !!b && !!u && b.ownerId === u.id;
      if (!b || (b.status !== "PUBLISHED" && !(opts?.preview && isOwner))) throw new ApiError("This storefront is not available.", 404);
      const items: PublicItem[] = s.items.filter((i) => i.businessId === b.id).map((i) => toPublicItem(i, b.showPrices));
      return { business: toPublicBusiness(b), items, isPreview: b.status !== "PUBLISHED" };
    },
    async list(filter) {
      await wait();
      const s = getState();
      const all = [...s.businesses.filter((b) => b.status === "PUBLISHED").map((b) => toPublicBusiness(b)), ...SAMPLE_BUSINESSES.map((x) => x.business)];
      const q = (filter?.q ?? "").trim().toLowerCase();
      return all.filter((b) => (!filter?.category || filter.category === "ALL" || b.category === filter.category) && (!q || `${b.name} ${b.town} ${b.county} ${b.description}`.toLowerCase().includes(q)));
    },
  },

  orders: {
    async submit(input: OrderInput) {
      await wait();
      const s = getState();
      const store = resolveStore(s, input.slug);
      const f: Record<string, string> = {};
      if (input.customerName.trim().length < 2) f.customerName = "Enter your name.";
      const contact = input.customerContact.trim();
      if (!EMAIL_RE.test(contact) && !PHONE_RE.test(contact)) f.customerContact = "Enter a phone number or email address.";
      if (input.notes.length > 500) f.notes = "Notes can be up to 500 characters.";
      if (input.items.length === 0 && input.notes.trim().length < 5) f.notes = "Tell the business what you would like to ask.";
      const seen = new Set<string>();
      for (const line of input.items) {
        const it = store.items.find((x) => x.id === line.itemId);
        if (!it || seen.has(line.itemId)) throw new ApiError("One of the selected items is not available from this business.", 422);
        seen.add(line.itemId);
        if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) throw new ApiError("Quantities must be whole numbers from 1 to 99.", 422);
        if (!it.available) throw new ApiError(`“${it.name}” is currently unavailable.`, 422);
        if (it.qty !== null && line.quantity > it.qty) throw new ApiError(`Only ${it.qty} of “${it.name}” available.`, 422);
      }
      if (Object.keys(f).length) throw new ApiError("Please fix the highlighted fields.", 422, f);

      const signature = input.items.map((l) => `${l.itemId}x${l.quantity}`).sort().join(",");
      const dup = s.orders.find((o) => o.businessId === store.id && o.customerContact === contact && o.status === "NEW" && Date.now() - new Date(o.createdAt).getTime() < 60_000 && o.items.map((l) => `${l.itemId}x${l.quantity}`).sort().join(",") === signature);
      if (dup) throw new ApiError("This request was just sent. Please wait a minute before sending it again.", 409);

      return mutate((st) => {
        const now = new Date().toISOString();
        const order: Order = {
          id: uid("o"), reference: newReference(st), businessId: store.id,
          customerName: input.customerName.trim(), customerContact: contact, notes: input.notes.trim(),
          // Names and prices are copied at order time so history never changes. Prices come from the server side, never from the client.
          items: input.items.map((l) => { const it = store.items.find((x) => x.id === l.itemId)!; return { itemId: it.id, name: it.name, unitPrice: it.price, quantity: l.quantity }; }),
          status: "NEW", paymentStatus: "UNPAID", createdAt: now, updatedAt: now, history: [{ at: now, label: "Request received" }], isSample: store.ownerless,
        };
        st.orders.push(order);
        // Customers only ever get the reference back, never other customers' data.
        return { reference: order.reference, businessName: store.name, createdAt: now };
      });
    },
    async list() {
      await wait();
      const s = getState(); const b = ownBusiness(s, requireUser(s));
      return b ? s.orders.filter((o) => o.businessId === b.id).sort((a, c) => c.createdAt.localeCompare(a.createdAt)) : [];
    },
    async get(id) { await wait(); const s = getState(); return ownOrder(s, requireUser(s), id); },
    async transition(id, to: OrderStatus) {
      await wait();
      return mutate((s) => {
        const o = ownOrder(s, requireUser(s), id);
        if (!TRANSITIONS[o.status].includes(to)) throw new ApiError(`A ${STATUS_LABEL[o.status].toLowerCase()} request cannot be changed to ${STATUS_LABEL[to].toLowerCase()}.`, 409);
        const now = new Date().toISOString();
        o.status = to; o.updatedAt = now; o.history.push({ at: now, label: `Status changed to ${STATUS_LABEL[to]}` });
        return o;
      });
    },
    async setPayment(id, status) {
      await wait();
      return mutate((s) => {
        const o = ownOrder(s, requireUser(s), id);
        if (o.status === "CANCELLED") throw new ApiError("Cancelled requests cannot be marked as paid.", 409);
        const now = new Date().toISOString();
        o.paymentStatus = status; o.updatedAt = now;
        o.history.push({ at: now, label: `Payment recorded manually as ${status === "PAID" ? "Paid" : "Unpaid"}` });
        return o;
      });
    },
  },

  security: {
    async analyzeMessage(text) {
      await wait();
      const err = validateMessage(text);
      if (err) throw new ApiError(err, 422);
      const r = analyzeMessage(text); // the message is analysed in memory and never stored
      return remember("MESSAGE", r);
    },
    async analyzeUrl(url) { await wait(); return remember("URL", analyzeUrl(url)); }, // never fetched or visited
    async checklist() { await wait(); const s = getState(); return checklistFor(s, requireUser(s)); },
    async setChecklistItem(key, done) {
      await wait();
      return mutate((s) => {
        const u = requireUser(s);
        if (!CHECKLIST_DEFS.some((d) => d.key === key)) throw new ApiError("Unknown checklist item.", 404);
        const set = new Set(s.checklist[u.id] ?? []);
        if (done) set.add(key); else set.delete(key);
        s.checklist[u.id] = [...set];
        return checklistFor(s, u);
      });
    },
    async incidents() { await wait(); return INCIDENT_GUIDES; },
    async history() {
      await wait(); const s = getState(); const u = requireUser(s);
      return (s.analyses ?? []).filter((a) => a.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(({ userId: _u, ...rest }) => rest);
    },
    async clearHistory() { await wait(); mutate((s) => { const u = requireUser(s); s.analyses = (s.analyses ?? []).filter((a) => a.userId !== u.id); }); },
  },

  dashboard: {
    async summary() {
      await wait();
      const s = getState(); const u = requireUser(s); const b = ownBusiness(s, u);
      const orders = b ? s.orders.filter((o) => o.businessId === b.id).sort((a, c) => c.createdAt.localeCompare(a.createdAt)) : [];
      const list = checklistFor(s, u);
      return {
        business: b, completion: completion(s, b), itemCount: b ? s.items.filter((i) => i.businessId === b.id).length : 0,
        newOrders: orders.filter((o) => o.status === "NEW").length,
        outstandingOrders: orders.filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELLED").length,
        recentOrders: orders.slice(0, 5), checklist: { done: list.filter((c) => c.done).length, total: list.length },
      };
    },
  },

  demo: { async reset() { await wait(); resetState(); } },
};
