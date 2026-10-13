from django.utils.text import slugify

from .models import BusinessProfile


def unique_slug(name: str) -> str:
    base = slugify(name)[:50] or "business"
    slug, n = base, 2
    while BusinessProfile.objects.filter(slug=slug).exists():
        slug = f"{base}-{n}"
        n += 1
    return slug


def missing_for_publish(b: BusinessProfile) -> list[str]:
    missing = []
    if len(b.name.strip()) < 2:
        missing.append("business name")
    if len(b.description.strip()) < 10:
        missing.append("a short description")
    if not b.county.strip() or not b.town.strip():
        missing.append("county and town")
    if not (b.phone or b.whatsapp or b.email):
        missing.append("a way for customers to contact you")
    return missing


def public_business(b: BusinessProfile) -> dict:
    """The ONLY projection anonymous visitors receive. Contact details only if the owner opted in."""
    return {
        "id": str(b.id), "slug": b.slug, "name": b.name, "category": b.category, "description": b.description,
        "county": b.county, "town": b.town, "publicAddress": b.public_address,
        **({"phone": b.phone} if b.show_phone and b.phone else {}),
        **({"whatsapp": b.whatsapp} if b.show_phone and b.whatsapp else {}),
        **({"email": b.email} if b.show_email and b.email else {}),
        "hours": b.hours, "showPrices": b.show_prices, "isSample": b.is_sample,
        **({"logoUrl": b.logo.url} if b.logo else {}),
    }


def public_item(i, show_prices: bool) -> dict:
    out_of_stock = (not i.available) or (i.track_stock and i.quantity == 0)
    low = i.track_stock and i.quantity is not None and 0 < i.quantity <= 5
    d = {
        "id": str(i.id), "name": i.name, "description": i.description, "category": i.category,
        "price": float(i.price) if (show_prices and i.price is not None) else None,
        "available": not out_of_stock,
    }
    if low:
        d["stockNote"] = f"Only {i.quantity} left"
    return d


def own_business(user):
    return BusinessProfile.objects.filter(owner=user).first() if user.is_authenticated else None
