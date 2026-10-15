/** SAMPLE DATA ONLY. Every record here is fictional and flagged isSample. */
import type { Business, CatalogItem, Category, Order, PublicBusiness, PublicItem, User } from "@/types";
import { defaultHours } from "@/lib/hours";

export interface DemoState {
  sessionUserId: string | null;
  users: User[];
  businesses: Business[];
  items: CatalogItem[];
  orders: Order[];
  checklist: Record<string, string[]>;
  /** Past checks: outcome only, never the checked text. */
  analyses?: { id: string; userId: string; kind: "MESSAGE" | "URL"; risk: "LOW" | "CAUTION" | "HIGH"; indicators: { id: string; label: string; severity: "low" | "medium" | "high" }[]; createdAt: string }[];
}

const iso = (minsAgo: number) => new Date(Date.now() - minsAgo * 60000).toISOString();

export const DEMO_USER: User = { id: "u_demo", name: "Fatuma Said", email: "fatuma@example.com", role: "OWNER" };
export const DEMO_SLUG = "mama-fatuma-fresh-catch";

export function demoState(): DemoState {
  const hours = defaultHours().map((h) => ({ ...h, open: "05:30", close: "17:00" }));
  const business: Business = {
    id: "b_demo", ownerId: DEMO_USER.id, name: "Mama Fatuma's Fresh Catch", category: "FISH_SEAFOOD",
    description: "Fresh fish and seafood landed each morning. Order ahead and collect at the market stall, cleaned and ready to cook.",
    county: "Mombasa", town: "Kongowea Market", publicAddress: "Stall 14, fish section", phone: "0700 000 000", whatsapp: "0700 000 000",
    email: "", showPhone: true, showEmail: false, hours, showPrices: true, slug: DEMO_SLUG, status: "PUBLISHED", isSample: true,
    createdAt: iso(60 * 24 * 12), updatedAt: iso(60 * 24 * 2),
  };
  const item = (id: string, name: string, description: string, price: number | null, category: string, extra: Partial<CatalogItem> = {}): CatalogItem => ({
    id, businessId: "b_demo", name, description, price, category, available: true, trackStock: false, quantity: null, ...extra,
  });
  const items: CatalogItem[] = [
    item("i_tilapia", "Fresh tilapia (per kg)", "Whole fish, scaled and cleaned on request.", 450, "Fish", { trackStock: true, quantity: 20 }),
    item("i_kingfish", "Kingfish steaks (per kg)", "Thick-cut steaks, ideal for grilling.", 900, "Fish", { trackStock: true, quantity: 4 }),
    item("i_prawns", "Prawns (per kg)", "Medium prawns, caught this week.", 1400, "Shellfish", { trackStock: true, quantity: 8 }),
    item("i_octopus", "Octopus (per kg)", "Cleaned and tenderised.", 700, "Shellfish"),
    item("i_sardines", "Sardines (per kg)", "Small fish, good for frying whole.", 250, "Fish"),
    item("i_plate", "Fried fish plate with ugali", "Ready-to-eat plate. Back next week.", 350, "Cooked food", { available: false }),
  ];
  const line = (itemId: string, name: string, unitPrice: number, quantity: number) => ({ itemId, name, unitPrice, quantity });
  const orders: Order[] = [
    { id: "o_1", reference: "CS-7KQ2MD", businessId: "b_demo", customerName: "Amina (sample customer)", customerContact: "0700 000 001", notes: "Please clean the fish. Pickup at 4pm.",
      items: [line("i_tilapia", "Fresh tilapia (per kg)", 450, 2), line("i_prawns", "Prawns (per kg)", 1400, 1)], status: "NEW", paymentStatus: "UNPAID",
      createdAt: iso(35), updatedAt: iso(35), history: [{ at: iso(35), label: "Request received" }], isSample: true },
    { id: "o_2", reference: "CS-4XWN8B", businessId: "b_demo", customerName: "Juma (sample customer)", customerContact: "0700 000 002", notes: "",
      items: [line("i_kingfish", "Kingfish steaks (per kg)", 900, 3)], status: "ACCEPTED", paymentStatus: "UNPAID",
      createdAt: iso(180), updatedAt: iso(150), history: [{ at: iso(180), label: "Request received" }, { at: iso(150), label: "Status changed to Accepted" }], isSample: true },
    { id: "o_3", reference: "CS-9HTE3C", businessId: "b_demo", customerName: "Sample Hotel Kitchen", customerContact: "kitchen@example.com", notes: "Weekly standing order.",
      items: [line("i_octopus", "Octopus (per kg)", 700, 10), line("i_sardines", "Sardines (per kg)", 250, 5)], status: "COMPLETED", paymentStatus: "PAID",
      createdAt: iso(60 * 26), updatedAt: iso(60 * 22),
      history: [{ at: iso(60 * 26), label: "Request received" }, { at: iso(60 * 25), label: "Status changed to Accepted" }, { at: iso(60 * 23), label: "Status changed to Ready" }, { at: iso(60 * 22), label: "Payment recorded manually as Paid" }, { at: iso(60 * 22), label: "Status changed to Completed" }], isSample: true },
  ];
  return {
    sessionUserId: null, users: [DEMO_USER], businesses: [business], items, orders,
    checklist: { [DEMO_USER.id]: ["pw-unique", "device-lock", "pay-verify"] },
  };
}

/* ------- Public sample storefronts (static, always published, never owned) ------- */
type Row = [name: string, description: string, price: number | null, category: string, available?: boolean];

function sample(slug: string, name: string, category: Category, county: string, town: string, description: string, phone: string, rows: Row[], showPrices = true) {
  const business: PublicBusiness = {
    id: `s_${slug}`, slug, name, category, description, county, town, publicAddress: "", phone, hours: defaultHours(), showPrices, isSample: true,
  };
  const items: PublicItem[] = rows.map(([n, d, p, c, a], idx) => ({ id: `${slug}_${idx}`, name: n, description: d, price: showPrices ? p : null, category: c, available: a ?? true }));
  return { business, items };
}

export const SAMPLE_BUSINESSES = [
  sample("bandari-fresh-fish", "Bandari Fresh Fish", "FISH_SEAFOOD", "Mombasa", "Old Town", "Daily catch from local fishers, sold by the kilo.", "0700 000 010", [
    ["Red snapper (per kg)", "Whole fish, cleaned.", 800, "Fish"], ["Crab (each)", "Live mud crab.", 600, "Shellfish"], ["Dried fish (bundle)", "Sun-dried, packed.", 300, "Dried", false],
  ]),
  sample("kongowea-greens", "Kongowea Greens & Groceries", "RETAIL_MARKET", "Mombasa", "Kongowea", "Fresh vegetables, fruit and household basics.", "0700 000 020", [
    ["Sukuma wiki (bundle)", "Fresh kale.", 30, "Vegetables"], ["Tomatoes (per kg)", "Ripe and firm.", 120, "Vegetables"], ["Mangoes (per piece)", "Sweet local mangoes.", 25, "Fruit"], ["Charcoal (small tin)", "Dry charcoal.", 80, "Household"],
  ]),
  sample("swahili-plate-nyali", "Swahili Plate Kitchen", "FOOD_HOSPITALITY", "Mombasa", "Nyali", "Coastal home-style meals and event catering.", "0700 000 030", [
    ["Pilau and kachumbari", "Spiced rice with beef.", 400, "Meals"], ["Coconut fish curry", "With chapati or rice.", 550, "Meals"], ["Mandazi (5 pieces)", "Fresh each morning.", 100, "Snacks"], ["Party catering (per head)", "Minimum 20 guests.", 750, "Catering"],
  ]),
  sample("likoni-stitch-studio", "Likoni Stitch Studio", "CLOTHING_TAILORING", "Mombasa", "Likoni", "Custom clothing, school uniforms and alterations.", "0700 000 040", [
    ["Trouser hem", "Standard alteration.", 150, "Alterations"], ["Kitenge dress (made to measure)", "Price depends on fabric.", null, "Custom"], ["School uniform set", "Shirt and shorts or skirt.", 1200, "Uniforms"],
  ], false),
  sample("changamwe-quick-fix", "Changamwe Quick Fix Garage", "REPAIRS_MECHANICS", "Mombasa", "Changamwe", "Motorbike and car servicing with honest quotes.", "0700 000 050", [
    ["Motorbike service", "Oil change and basic check.", 1200, "Services"], ["Puncture repair", "Tube or tubeless.", 200, "Services"], ["Brake pad replacement", "Parts quoted separately.", null, "Services"],
  ], false),
  sample("diani-dhow-tours", "Diani Dhow Tours", "TOURISM", "Kwale", "Diani", "Sunset dhow sails and snorkelling trips.", "0700 000 060", [
    ["Sunset dhow sail", "Two hours on the water.", 3500, "Trips"], ["Snorkelling half-day", "Equipment included.", 5500, "Trips"], ["Private charter", "Up to 8 guests.", 18000, "Charters", false],
  ]),
  sample("malindi-print-hub", "Malindi Print & Phone Hub", "OTHER", "Kilifi", "Malindi", "Printing, photocopying and phone screen repairs.", "0700 000 070", [
    ["Black & white printing (per page)", "A4.", 10, "Printing"], ["Colour printing (per page)", "A4.", 30, "Printing"], ["Phone screen repair", "Price depends on model.", null, "Repairs"],
  ], false),
];
