import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BadgeCheck, ClipboardList, KeyRound, LifeBuoy, ListChecks, QrCode, ShieldCheck, Store, UserPlus } from "lucide-react";
import { buttonClass } from "@/components/common/Button";
import { CATEGORIES } from "@/lib/categories";
import { HeroMock } from "@/components/landing/HeroMock";
import { ProductPreview } from "@/components/landing/ProductPreview";
import { analyzeMessage } from "@/services/security/analyzer";
import { SAMPLE_MESSAGES } from "@/services/security/samples";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const { t } = useTranslation();
  const example = SAMPLE_MESSAGES.find((m) => m.id === "account-link")!;
  const analysis = analyzeMessage(example.text);

  const FEATURES = [
    { icon: Store, title: t("landing.feature1Title"), text: t("landing.feature1Text") },
    { icon: QrCode, title: t("landing.feature2Title"), text: t("landing.feature2Text") },
    { icon: ClipboardList, title: t("landing.feature3Title"), text: t("landing.feature3Text") },
    { icon: ShieldCheck, title: t("landing.feature4Title"), text: t("landing.feature4Text") },
    { icon: ListChecks, title: t("landing.feature5Title"), text: t("landing.feature5Text") },
    { icon: LifeBuoy, title: t("landing.feature6Title"), text: t("landing.feature6Text") },
  ];

  const STEPS = [
    { icon: UserPlus, title: t("landing.step1Title"), text: t("landing.step1Text") },
    { icon: QrCode, title: t("landing.step2Title"), text: t("landing.step2Text") },
    { icon: ClipboardList, title: t("landing.step3Title"), text: t("landing.step3Text") },
  ];
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-sand-50 to-sand-100">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-12 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-sm font-semibold text-teal-900"><BadgeCheck className="h-4 w-4" aria-hidden />{t("landing.badge")}</p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">{t("landing.heroTitle")} <span className="text-teal-600">{t("landing.heroTitle").split(". ")[1] || t("landing.heroTitle")}</span></h1>
            <p className="mt-5 max-w-xl text-lg text-navy-700">{t("landing.heroSubtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className={buttonClass("primary", "lg")}>{t("landing.ctaPrimary")}<ArrowRight className="h-5 w-5" aria-hidden /></Link>
              <a href="#how-it-works" className={buttonClass("secondary", "lg")}>{t("landing.ctaSecondary")}</a>
            </div>
            <p className="mt-5 flex items-start gap-2 text-navy-700"><BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" aria-hidden />{t("landing.heroNote")}</p>
          </div>
          <div className="pb-8"><HeroMock /></div>
        </div>
      </section>

      <section id="features" className="scroll-mt-20 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold sm:text-4xl">{t("landing.featuresTitle")}</h2>
          <p className="mt-2 max-w-2xl text-navy-700">{t("landing.featuresSubtitle")}</p>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="card p-6"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-800"><f.icon className="h-6 w-6" aria-hidden /></span><h3 className="mt-4 text-lg font-bold">{f.title}</h3><p className="mt-1.5 text-navy-700">{f.text}</p></li>
            ))}
          </ul>
        </div>
      </section>

      <section id="categories" className="scroll-mt-20 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold sm:text-4xl">{t("landing.categoriesTitle")}</h2>
          <p className="mt-2 max-w-2xl text-navy-700">{t("landing.categoriesSubtitle")}</p>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((c) => (
              <li key={c.value}>
                <Link to={`/discover?category=${c.value}`} className="card group flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
                  <span className={cn("flex h-14 w-14 items-center justify-center rounded-2xl", c.tile)}><c.icon className="h-7 w-7" aria-hidden /></span>
                  <h3 className="mt-4 text-xl font-bold">{c.label}</h3>
                  <p className="mt-1 flex-1 text-navy-700">{c.blurb}</p>
                  <span className="mt-4 inline-flex items-center gap-1 font-semibold text-teal-800">{t("landing.seeSamples")}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden /></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 bg-navy-900 py-16 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold sm:text-4xl">{t("landing.howItWorksTitle")}</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white"><s.icon className="h-7 w-7" aria-hidden /></span>
                <p className="mt-4 text-sm font-bold text-teal-300">Step {i + 1}</p>
                <h3 className="mt-1 text-xl font-bold">{s.title}</h3>
                <p className="mt-1.5 text-navy-100">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="security" className="scroll-mt-20 py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-coral-700"><KeyRound className="h-4 w-4" aria-hidden />{t("security.securityAssistant")}</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">{t("landing.securityTitle")}</h2>
            <p className="mt-3 text-lg text-navy-700">{t("landing.securitySubtitle")}</p>
            <p className="mt-3 text-navy-700">{t("landing.securityDisclaimer")}</p>
            <Link to="/register" className={cn(buttonClass("navy", "lg"), "mt-6")}>{t("landing.trySecurity")}</Link>
          </div>
          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-navy-600">{t("landing.exampleMessage")}</p>
            <blockquote className="mt-2 rounded-2xl rounded-tl-sm bg-sand-100 p-4 text-navy-900">{example.text}</blockquote>
            <p className="mt-4 text-sm font-bold">{t("landing.warningSigns")}</p>
            <ul className="mt-2 space-y-1.5">
              {analysis.indicators.slice(0, 4).map((i) => <li key={i.id} className="flex items-start gap-2 text-sm"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-coral-500" aria-hidden />{i.label}</li>)}
            </ul>
            <p className="mt-4 rounded-xl bg-sand-50 p-3 text-sm text-navy-800">{t("landing.suggestedStep")}</p>
          </div>
        </div>
      </section>

      <section id="preview" className="scroll-mt-20 bg-sand-100 py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-3xl font-bold sm:text-4xl">{t("landing.previewTitle")}</h2>
          <p className="mb-8 mt-2 text-navy-700">{t("landing.previewSubtitle")}</p>
          <ProductPreview />
        </div>
      </section>

      <section className="bg-teal-800 py-16 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">{t("landing.finalCtaTitle")}</h2>
          <p className="mt-3 text-teal-100">{t("landing.finalCtaSubtitle")}</p>
          <Link to="/register" className={cn(buttonClass("light", "lg"), "mt-7")}>{t("landing.getStartedFree")}<ArrowRight className="h-5 w-5" aria-hidden /></Link>
        </div>
      </section>
    </>
  );
}
