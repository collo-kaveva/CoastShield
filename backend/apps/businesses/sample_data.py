"""SAMPLE DATA ONLY. Every record is fictional and flagged is_sample=True."""
from datetime import timedelta

HOURS = lambda o, c: [{"day": d, "open": o, "close": c, "closed": d == "Sunday"} for d in
                      ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]]

DEMO_EMAIL = "fatuma@example.com"
DEMO_PASSWORD = "demo-password"  # development/demo only. Never use for a real account.
DEMO_NAME = "Fatuma Said"

DEMO_BUSINESS = dict(
    name="Mama Fatuma's Fresh Catch", slug="mama-fatuma-fresh-catch", category="FISH_SEAFOOD",
    description="Fresh fish and seafood landed each morning. Order ahead and collect at the market stall, cleaned and ready to cook.",
    county="Mombasa", town="Kongowea Market", public_address="Stall 14, fish section", phone="0700 000 000", whatsapp="0700 000 000",
    show_phone=True, show_email=False, show_prices=True, hours=HOURS("05:30", "17:00"),
)
# (key, name, description, price, category, extra)
DEMO_ITEMS = [
    ("tilapia", "Fresh tilapia (per kg)", "Whole fish, scaled and cleaned on request.", 450, "Fish", dict(track_stock=True, quantity=20)),
    ("kingfish", "Kingfish steaks (per kg)", "Thick-cut steaks, ideal for grilling.", 900, "Fish", dict(track_stock=True, quantity=4)),
    ("prawns", "Prawns (per kg)", "Medium prawns, caught this week.", 1400, "Shellfish", dict(track_stock=True, quantity=8)),
    ("octopus", "Octopus (per kg)", "Cleaned and tenderised.", 700, "Shellfish", {}),
    ("sardines", "Sardines (per kg)", "Small fish, good for frying whole.", 250, "Fish", {}),
    ("plate", "Fried fish plate with ugali", "Ready-to-eat plate. Back next week.", 350, "Cooked food", dict(available=False)),
]
# (reference, customer, contact, notes, [(item key, qty)], status chain, paid, minutes ago)
DEMO_ORDERS = [
    ("CS-7KQ2MD", "Amina (sample customer)", "0700 000 001", "Please clean the fish. Pickup at 4pm.", [("tilapia", 2), ("prawns", 1)], ["NEW"], False, 35),
    ("CS-4XWN8B", "Juma (sample customer)", "0700 000 002", "", [("kingfish", 3)], ["NEW", "ACCEPTED"], False, 180),
    ("CS-9HTE3C", "Sample Hotel Kitchen", "kitchen@example.com", "Weekly standing order.", [("octopus", 10), ("sardines", 5)], ["NEW", "ACCEPTED", "READY", "COMPLETED"], True, 60 * 26),
]
DEMO_CHECKLIST = ["pw-unique", "device-lock", "pay-verify"]

# (slug, name, category, county, town, description, phone, show_prices, [(name, desc, price, group, available)])
SAMPLES = [
    ("bandari-fresh-fish", "Bandari Fresh Fish", "FISH_SEAFOOD", "Mombasa", "Old Town", "Daily catch from local fishers, sold by the kilo.", "0700 000 010", True,
     [("Red snapper (per kg)", "Whole fish, cleaned.", 800, "Fish", True), ("Crab (each)", "Live mud crab.", 600, "Shellfish", True), ("Dried fish (bundle)", "Sun-dried, packed.", 300, "Dried", False)]),
    ("kongowea-greens", "Kongowea Greens & Groceries", "RETAIL_MARKET", "Mombasa", "Kongowea", "Fresh vegetables, fruit and household basics.", "0700 000 020", True,
     [("Sukuma wiki (bundle)", "Fresh kale.", 30, "Vegetables", True), ("Tomatoes (per kg)", "Ripe and firm.", 120, "Vegetables", True), ("Mangoes (per piece)", "Sweet local mangoes.", 25, "Fruit", True), ("Charcoal (small tin)", "Dry charcoal.", 80, "Household", True)]),
    ("swahili-plate-nyali", "Swahili Plate Kitchen", "FOOD_HOSPITALITY", "Mombasa", "Nyali", "Coastal home-style meals and event catering.", "0700 000 030", True,
     [("Pilau and kachumbari", "Spiced rice with beef.", 400, "Meals", True), ("Coconut fish curry", "With chapati or rice.", 550, "Meals", True), ("Mandazi (5 pieces)", "Fresh each morning.", 100, "Snacks", True), ("Party catering (per head)", "Minimum 20 guests.", 750, "Catering", True)]),
    ("likoni-stitch-studio", "Likoni Stitch Studio", "CLOTHING_TAILORING", "Mombasa", "Likoni", "Custom clothing, school uniforms and alterations.", "0700 000 040", False,
     [("Trouser hem", "Standard alteration.", 150, "Alterations", True), ("Kitenge dress (made to measure)", "Price depends on fabric.", None, "Custom", True), ("School uniform set", "Shirt and shorts or skirt.", 1200, "Uniforms", True)]),
    ("changamwe-quick-fix", "Changamwe Quick Fix Garage", "REPAIRS_MECHANICS", "Mombasa", "Changamwe", "Motorbike and car servicing with honest quotes.", "0700 000 050", False,
     [("Motorbike service", "Oil change and basic check.", 1200, "Services", True), ("Puncture repair", "Tube or tubeless.", 200, "Services", True), ("Brake pad replacement", "Parts quoted separately.", None, "Services", True)]),
    ("diani-dhow-tours", "Diani Dhow Tours", "TOURISM", "Kwale", "Diani", "Sunset dhow sails and snorkelling trips.", "0700 000 060", True,
     [("Sunset dhow sail", "Two hours on the water.", 3500, "Trips", True), ("Snorkelling half-day", "Equipment included.", 5500, "Trips", True), ("Private charter", "Up to 8 guests.", 18000, "Charters", False)]),
    ("malindi-print-hub", "Malindi Print & Phone Hub", "OTHER", "Kilifi", "Malindi", "Printing, photocopying and phone screen repairs.", "0700 000 070", False,
     [("Black & white printing (per page)", "A4.", 10, "Printing", True), ("Colour printing (per page)", "A4.", 30, "Printing", True), ("Phone screen repair", "Price depends on model.", None, "Repairs", True)]),
]
