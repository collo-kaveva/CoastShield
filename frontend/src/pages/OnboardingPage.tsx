import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Plus, Rocket, Save, Trash2 } from "lucide-react";
import { businessSchema, type BusinessFormValues } from "@/lib/businessSchema";
import { defaultHours } from "@/lib/hours";
import { COUNTIES } from "@/lib/categories";
import { toPublicBusiness, toPublicItem } from "@/lib/public";
import { useBusiness, useCatalog, useCreateItem, usePublish, useSaveBusiness } from "@/hooks/queries";
import { Button } from "@/components/common/Button";
import { CheckField, SelectField, TextArea, TextField } from "@/components/common/Fields";
import { CategoryPicker } from "@/components/storefront/CategoryPicker";
import { HoursEditor } from "@/components/storefront/HoursEditor";
import { StorefrontView } from "@/components/storefront/StorefrontView";
import { Loading } from "@/components/common/States";
import { useToast } from "@/app/ToastProvider";
import { errorMessage } from "@/lib/utils";
import type { Category } from "@/types";

const STEPS = [
  { title: "Your business", fields: ["name", "category"] },
  { title: "Location", fields: ["county", "town", "description", "publicAddress"] },
  { title: "Contact & hours", fields: ["phone", "whatsapp", "email"] },
  { title: "Products", fields: [] },
  { title: "Preview & publish", fields: [] },
] as const;

interface Draft { name: string; price: string }

export default function OnboardingPage() {
  const biz = useBusiness();
  const catalog = useCatalog();
  const save = useSaveBusiness();
  const publish = usePublish();
  const createItem = useCreateItem();
  const nav = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [d, setD] = useState<Draft>({ name: "", price: "" });
  const [error, setError] = useState<string | null>(null);

  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(businessSchema), mode: "onTouched",
    defaultValues: { name: "", category: "" as Category, county: "Mombasa", town: "", description: "", publicAddress: "", phone: "", whatsapp: "", email: "", showPhone: true, showEmail: false, showPrices: true, hours: defaultHours() },
  });
  const { register, control, watch, trigger, getValues, setValue, formState: { errors } } = form;

  useEffect(() => { if (biz.data) form.reset({ ...biz.data }); }, [biz.data]); // resume a saved draft
  if (biz.isLoading) return <Loading />;
  if (biz.data?.status === "PUBLISHED") return <Navigate to="/dashboard" replace />;

  const progress = ((step + 1) / STEPS.length) * 100;
  const next = async () => { if (await trigger([...STEPS[step].fields])) setStep((s) => s + 1); };

  const persist = async (andPublish: boolean) => {
    setError(null);
    try {
      await save.mutateAsync(getValues());
      for (const it of drafts) await createItem.mutateAsync({ name: it.name, description: "", price: it.price === "" ? null : Number(it.price), category: "Items", available: true, trackStock: false, quantity: null });
      setDrafts([]);
      if (andPublish) { await publish.mutateAsync(undefined); toast("Your storefront is live!"); } else toast("Draft saved. You can finish later.");
      nav("/dashboard");
    } catch (e) { setError(errorMessage(e)); }
  };

  const saveAndExit = async () => {
    if (!(await trigger(["name", "category"]))) return toast("Add a business name and category first, then save your draft.", "error");
    await persist(false);
  };

  const addDraft = () => {
    const price = d.price.trim();
    if (d.name.trim().length < 2) return toast("Enter a name for the item.", "error");
    if (price !== "" && (!Number.isFinite(Number(price)) || Number(price) < 0)) return toast("Enter a valid price, or leave it empty.", "error");
    setDrafts((l) => [...l, { name: d.name.trim(), price }]); setD({ name: "", price: "" });
  };

  const v = watch();
  const previewItems = [...(catalog.data ?? []), ...drafts.map((x, i) => ({ id: `d${i}`, name: x.name, description: "", price: x.price === "" ? null : Number(x.price), category: "Items", available: true, trackStock: false, quantity: null }))].map((i) => toPublicItem(i, v.showPrices));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold text-lagoon-800">Step {step + 1} of {STEPS.length}: {STEPS[step].title}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ocean-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="Onboarding progress"><div className="h-full rounded-full bg-lagoon-600 transition-all" style={{ width: `${progress}%` }} /></div>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">{error}</p>}

      <div className="card p-5 sm:p-7">
        {step === 0 && (
          <div className="space-y-5">
            <div><h1 className="text-2xl font-bold">Tell us about your business</h1><p className="mt-1 text-ocean-600">This becomes the heading of your storefront.</p></div>
            <TextField label="Business name" placeholder="e.g. Mama Fatuma's Fresh Catch" error={errors.name?.message} {...register("name")} />
            <Controller control={control} name="category" render={({ field }) => <CategoryPicker value={field.value} onChange={(c) => { field.onChange(c); }} error={errors.category?.message} />} />
          </div>
        )}
        {step === 1 && (
          <div className="space-y-5">
            <div><h1 className="text-2xl font-bold">Where are you, and what do you do?</h1><p className="mt-1 text-ocean-600">Help customers find and trust you.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="County" error={errors.county?.message} {...register("county")}>{COUNTIES.map((c) => <option key={c}>{c}</option>)}</SelectField>
              <TextField label="Town or area" placeholder="e.g. Nyali" error={errors.town?.message} {...register("town")} />
            </div>
            <TextArea label="Short description" hint="One or two sentences." error={errors.description?.message} {...register("description")} />
            <TextField label="Public address (optional)" hint="Only shown if you fill it in." error={errors.publicAddress?.message} {...register("publicAddress")} />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-5">
            <div><h1 className="text-2xl font-bold">How can customers reach you?</h1><p className="mt-1 text-ocean-600">You choose what is shown publicly.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Phone" type="tel" autoComplete="tel" error={errors.phone?.message} {...register("phone")} />
              <TextField label="WhatsApp (optional)" type="tel" error={errors.whatsapp?.message} {...register("whatsapp")} />
            </div>
            <TextField label="Email (optional)" type="email" error={errors.email?.message} {...register("email")} />
            <div className="space-y-3 rounded-xl bg-sand-100 p-4"><CheckField label="Show my phone and WhatsApp on my storefront" {...register("showPhone")} /><CheckField label="Show my email on my storefront" {...register("showEmail")} /></div>
            <HoursEditor value={v.hours} onChange={(h) => setValue("hours", h)} />
          </div>
        )}
        {step === 3 && (
          <div className="space-y-5">
            <div><h1 className="text-2xl font-bold">Add a few products or services</h1><p className="mt-1 text-ocean-600">Optional. You can add more later in your catalog.</p></div>
            {(catalog.data?.length ?? 0) > 0 && <p className="rounded-xl bg-lagoon-50 px-4 py-2 text-sm text-lagoon-900">{catalog.data!.length} item(s) already saved in your draft.</p>}
            <div className="grid gap-3 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
              <TextField label="Name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDraft(); } }} />
              <TextField label="Price (KES)" inputMode="decimal" value={d.price} onChange={(e) => setD({ ...d, price: e.target.value })} />
              <Button variant="secondary" onClick={addDraft}><Plus className="h-4 w-4" />Add</Button>
            </div>
            <CheckField label="Show prices on my storefront" hint="Turn off if you prefer customers to ask for a price." {...register("showPrices")} />
            {drafts.length > 0 && (
              <ul className="divide-y divide-sand-200 rounded-xl border border-sand-200">
                {drafts.map((x, i) => (
                  <li key={`${x.name}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span>{x.name}{x.price !== "" && <span className="ml-2 text-ocean-600">KES {x.price}</span>}</span>
                    <button onClick={() => setDrafts((l) => l.filter((_, idx) => idx !== i))} className="flex h-9 w-9 items-center justify-center rounded-lg text-coral-700 hover:bg-coral-50" aria-label={`Remove ${x.name}`}><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {step === 4 && (
          <div className="space-y-4">
            <div><h1 className="text-2xl font-bold">Preview your storefront</h1><p className="mt-1 text-ocean-600">This is what customers will see. Publish when you are happy.</p></div>
            <div className="max-h-[28rem] overflow-y-auto rounded-xl border border-sand-300"><StorefrontView mode="preview" business={toPublicBusiness({ ...v })} items={previewItems} /></div>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={step === 0 ? saveAndExit : () => setStep((s) => s - 1)} disabled={step === 0 && false}>
          {step === 0 ? <><Save className="h-4 w-4" />Save draft & exit</> : <><ArrowLeft className="h-4 w-4" />Back</>}
        </Button>
        <div className="flex flex-wrap gap-2">
          {step > 0 && <Button variant="secondary" onClick={saveAndExit} loading={save.isPending && !publish.isPending}><Save className="h-4 w-4" />Save draft</Button>}
          {step < STEPS.length - 1 ? <Button onClick={next}>Continue<ArrowRight className="h-4 w-4" /></Button>
            : <Button onClick={() => persist(true)} loading={publish.isPending || save.isPending}><Rocket className="h-4 w-4" />Publish storefront</Button>}
        </div>
      </div>
    </div>
  );
}
