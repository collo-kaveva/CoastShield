import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, ClipboardList, KeyRound, LifeBuoy, ListChecks, QrCode, ShieldCheck, Store, UserPlus } from "lucide-react";
import { buttonClass } from "@/components/common/Button";
import { CATEGORIES } from "@/lib/categories";
import { HeroMock } from "@/components/landing/HeroMock";
import { ProductPreview } from "@/components/landing/ProductPreview";
import { analyzeMessage } from "@/services/security/analyzer";
import { SAMPLE_MESSAGES } from "@/services/security/samples";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: Store, title: "A storefront, no website needed", text: "Add your products or services and get a clean page customers can open on any phone." },
  { icon: QrCode, title: "Share a link or QR code", text: "Print the QR code for your stall or shop window, or send the link on WhatsApp." },
  { icon: ClipboardList, title: "Simple order requests", text: "Customers send requests; you accept them and move them to ready and completed." },
  { icon: ShieldCheck, title: "Spot scam messages", text: "Paste a suspicious message and see the warning signs and what to do next." },
  { icon: ListChecks, title: "Practical security checklist", text: "Small, doable steps for passwords, phones and safer payment checks." },
  { icon: LifeBuoy, title: "Step-by-step incident help", text: "Know what to do after a lost phone, a suspicious payment or a clicked link." },
];

const STEPS = [
  { icon: UserPlus, title: "Create your business profile", text: "Answer a few short questions. Save a draft and finish later." },
  { icon: QrCode, title: "Share your link or QR code", text: "Publish when ready, then share your storefront with customers." },
  { icon: ClipboardList, title: "Manage requests and stay safer", text: "Handle customer requests and learn practical digital safety habits." },
];

export default function LandingPage() {
  const example = SAMPLE_MESSAGES.find((m) => m.id === "account-link")!;
  const analysis = analyzeMessage(example.text);
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-sand-50 to-sand-100">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-12 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-lagoon-100 px-3 py-1 text-sm font-semibold text-lagoon-900"><BadgeCheck className="h-4 w-4" aria-hidden />Built for small businesses on the Kenyan coast</p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">Grow Your Business. <span className="text-lagoon-700">Stay Safer Online.</span></h1>
            <p className="mt-5 max-w-xl text-lg text-ocean-700">Create your digital storefront, manage customer orders, and get practical cybersecurity guidance, all in one simple platform built for small businesses.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className={buttonClass("primary", "lg")}>Create Your Storefront<ArrowRight className="h-5 w-5" aria-hidden /></Link>
              <a href="#how-it-works" className={buttonClass("secondary", "lg")}>Explore How It Works</a>
            </div>
            <p className="mt-5 flex items-start gap-2 text-ocean-700"><BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-lagoon-700" aria-hidden />You can start without building your own website. Free to try in this demo.</p>
          </div>
          <div className="pb-8"><HeroMock /></div>
        </div>
      </section>

      <section id="features" className="scroll-mt-20 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold sm:text-4xl">Everything a small business needs to get started</h2>
          <p className="mt-2 max-w-2xl text-ocean-700">Simple tools, written in plain language, that work well on a phone.</p>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="card p-6"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-lagoon-100 text-lagoon-800"><f.icon className="h-6 w-6" aria-hidden /></span><h3 className="mt-4 text-lg font-bold">{f.title}</h3><p className="mt-1.5 text-ocean-700">{f.text}</p></li>
            ))}
          </ul>
        </div>
      </section>

      <section id="categories" className="scroll-mt-20 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold sm:text-4xl">Made for how coastal businesses really work</h2>
          <p className="mt-2 max-w-2xl text-ocean-700">Pick a category to see sample storefronts. Every business can show what matters to its customers.</p>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((c) => (
              <li key={c.value}>
                <Link to={`/discover?category=${c.value}`} className="card group flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
                  <span className={cn("flex h-14 w-14 items-center justify-center rounded-2xl", c.tile)}><c.icon className="h-7 w-7" aria-hidden /></span>
                  <h3 className="mt-4 text-xl font-bold">{c.label}</h3>
                  <p className="mt-1 flex-1 text-ocean-700">{c.blurb}</p>
                  <span className="mt-4 inline-flex items-center gap-1 font-semibold text-lagoon-800">See samples<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden /></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 bg-ocean-900 py-16 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold sm:text-4xl">How it works</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lagoon-600 text-white"><s.icon className="h-7 w-7" aria-hidden /></span>
                <p className="mt-4 text-sm font-bold text-lagoon-300">Step {i + 1}</p>
                <h3 className="mt-1 text-xl font-bold">{s.title}</h3>
                <p className="mt-1.5 text-ocean-100">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="security" className="scroll-mt-20 py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-coral-700"><KeyRound className="h-4 w-4" aria-hidden />Practical cybersecurity</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Recognise the warning signs before you act</h2>
            <p className="mt-3 text-lg text-ocean-700">Scam messages often copy payment notifications and bank alerts. CoastShield's security assistant highlights common warning signs and suggests safer next steps.</p>
            <p className="mt-3 text-ocean-700">It is a guide, not a guarantee. It can miss threats, and it never asks for your PIN, password or one-time codes.</p>
            <Link to="/register" className={cn(buttonClass("navy", "lg"), "mt-6")}>Try the security assistant</Link>
          </div>
          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-ocean-600">Example suspicious message (fictional)</p>
            <blockquote className="mt-2 rounded-2xl rounded-tl-sm bg-sand-100 p-4 text-ocean-900">{example.text}</blockquote>
            <p className="mt-4 text-sm font-bold">Warning signs the assistant noticed:</p>
            <ul className="mt-2 space-y-1.5">
              {analysis.indicators.slice(0, 4).map((i) => <li key={i.id} className="flex items-start gap-2 text-sm"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-coral-500" aria-hidden />{i.label}</li>)}
            </ul>
            <p className="mt-4 rounded-xl bg-ocean-50 p-3 text-sm text-ocean-800">Suggested step: do not tap the link. Open your official app yourself, or contact your provider through an official channel.</p>
          </div>
        </div>
      </section>

      <section id="preview" className="scroll-mt-20 bg-sand-100 py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-3xl font-bold sm:text-4xl">See it in action</h2>
          <p className="mb-8 mt-2 text-ocean-700">An interactive preview with sample data. Nothing you do here is saved.</p>
          <ProductPreview />
        </div>
      </section>

      <section className="bg-lagoon-800 py-16 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to put your business online?</h2>
          <p className="mt-3 text-lagoon-100">Create your first digital storefront today. It takes a few minutes and works on any phone.</p>
          <Link to="/register" className={cn(buttonClass("light", "lg"), "mt-7")}>Get Started Free<ArrowRight className="h-5 w-5" aria-hidden /></Link>
        </div>
      </section>
    </>
  );
}
