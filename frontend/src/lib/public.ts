import type { Business, CatalogItem, PublicBusiness, PublicItem } from "@/types";

type BusinessLike = Omit<Business, "ownerId" | "createdAt" | "updatedAt" | "status" | "id" | "slug" | "isSample"> &
  Partial<Pick<Business, "id" | "slug" | "isSample" | "logoUrl">>;

/** Builds the anonymous view. Contact details appear only if the owner opted in. */
export function toPublicBusiness(b: BusinessLike): PublicBusiness {
  return {
    id: b.id ?? "preview", slug: b.slug ?? "preview", name: b.name, category: b.category,
    description: b.description, county: b.county, town: b.town, publicAddress: b.publicAddress,
    phone: b.showPhone && b.phone ? b.phone : undefined,
    whatsapp: b.showPhone && b.whatsapp ? b.whatsapp : undefined,
    email: b.showEmail && b.email ? b.email : undefined,
    hours: b.hours, showPrices: b.showPrices, isSample: b.isSample ?? false, logoUrl: b.logoUrl ?? undefined,
  };
}

export function toPublicItem(i: Omit<CatalogItem, "businessId">, showPrices: boolean): PublicItem {
  const low = i.trackStock && i.quantity !== null && i.quantity > 0 && i.quantity <= 5;
  const out = !i.available || (i.trackStock && i.quantity === 0);
  return {
    id: i.id, name: i.name, description: i.description, category: i.category,
    price: showPrices ? i.price : null, available: !out,
    stockNote: low ? `Only ${i.quantity} left` : undefined,
  };
}
