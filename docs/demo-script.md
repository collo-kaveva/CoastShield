# Demo script (about 8 minutes)

**Story:** *Asha sells fish in Nyali. She has no website, gets orders by WhatsApp, and last month nearly "returned" a fake mistaken payment.*
Every sample record is fictional and labelled. The demo needs **no external service or internet** beyond your own laptop.

## Before you present (5 minutes, once)
1. `./scripts/demo-reset.sh` (clears rehearsal accounts, reloads clearly-labelled sample data, a demo owner and a demo admin).
2. Start Django (`./scripts/dev-backend.sh`) and the frontend in API mode with the sample-login button on:
   `cd frontend && VITE_DATA_MODE=api VITE_SHOW_SAMPLE_LOGIN=true npm run dev` → open `http://localhost:5173`.
3. Open three browser windows: **A** (Asha, the owner), **B** (a private window: the customer), **C** (admin, optional).
4. Sanity check: `http://localhost:8000/api/v1/health/` shows `{"status":"ok","database":"ok"}`.
5. **Backup plan:** if the backend is unavailable, run the frontend with `VITE_DATA_MODE=demo`. Every step below works there too, except the admin screen and logo upload (the app says so).

## Run of show
| # | Do this | Say this | Expect |
|---|---|---|---|
| 1 | Window A: landing page. Scroll to "See it in action"; click the **Security check** tab and a sample message. | "A small business owner gets scam texts like this every week." | The preview shows the real analyzer finding warning signs |
| 2 | **Get Started Free** → register as *Asha Mwinyi*. | "No website skills needed." | Guided straight into onboarding |
| 3 | Onboarding: *Asha's Fresh Fish*, Fish & seafood, Nyali, a short description, phone `0700 555 666`. Add *Tilapia (per kg)* 450 and *Prawns (per kg)* 1400. **Publish storefront**. | "Five short steps; she can save a draft and finish later." | Dashboard shows **Published** and a **QR code** |
| 4 | Click **Download** (or **Print**) on the QR code. | "She prints this and sticks it on her stall." | A PNG downloads |
| 5 | Window B: open the storefront link (or scan the QR). Add both items, **Send order request**, name *Zuhura*, phone `0711 222 333`. | "The customer needs no account." | A reference like `CS-XXXXXX` is shown |
| 6 | Window B: **Check the progress of this request later** → enter the phone → **Check status**. Then try a *wrong* phone number. | "Only the right reference **and** contact reveal anything." | Status **New**; wrong number shows only "No matching request found" |
| 7 | Window A: **Orders** → open the request → **Accept request** → **Mark as ready**. Window B: re-check. | "She controls the workflow; the customer sees progress." | Customer sees Accepted, then Ready |
| 8 | Window A: **Record as paid** (confirm) → **Mark completed**. | "CoastShield never verifies or processes payments. She records it after checking her **own** M-PESA." | Payment note and a history timeline |
| 9 | Window A: **Security centre** → sample *"Sent by mistake" payment* → **Analyze message**. | "This is the scam she nearly fell for." | **High warning level**, each warning sign with an explanation, safe steps, the "automated indicators, not confirmed findings" banner and the preliminary-result disclaimer |
| 10 | Open **Recent checks**; point out the privacy line; **Clear history**. | "The message itself is never stored. Only the outcome, and she can delete it." | History list, then empty |
| 11 | Window C (optional): sign in as `admin@example.com` / `demo-admin-password`. | "An administrator sees security events but has no screen for orders, customers or message text." | Audit table; filter by `ORDER_STATUS_CHANGED`; no private data |
| 12 | Close: **Checklist** and **Incident guides**. | "Practical steps, pointing to official channels." | Progress bar; step-by-step guides |

## If someone asks
- **"Is it secure?"** Server-enforced ownership, CSRF, rate limits, audit log, hardened uploads. See `docs/security-model.md`, and its list of what is *not* done.
- **"Does it detect all fraud?"** No. It is a rule-based, explainable aid that can miss threats. It never opens links and never verifies payments.
- **"Does it take payments?"** No, by design.
- **"What if the internet is down?"** The demo needs none. All assets are bundled, and `scripts/e2e_demo.py` verifies zero external requests.

## After the demo
`./scripts/demo-reset.sh` returns everything to the starting state.
