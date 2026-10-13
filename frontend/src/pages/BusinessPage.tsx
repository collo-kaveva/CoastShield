import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, Save } from "lucide-react";
import { businessSchema, type BusinessFormValues } from "@/lib/businessSchema";
import { COUNTIES } from "@/lib/categories";
import { toPublicBusiness, toPublicItem } from "@/lib/public";
import { useBusiness, useCatalog, usePublish, useRemoveLogo, useSaveBusiness, useUnpublish, useUploadLogo } from "@/hooks/queries";
import { Badge, Breadcrumbs, ErrorState, Loading, PageHeader } from "@/components/common/States";
import { Button, buttonClass } from "@/components/common/Button";
import { CheckField, SelectField, TextArea, TextField } from "@/components/common/Fields";
import { CategoryPicker } from "@/components/storefront/CategoryPicker";
import { HoursEditor } from "@/components/storefront/HoursEditor";
import { StorefrontView } from "@/components/storefront/StorefrontView";
import { QrCard, useCopy } from "@/components/common/QrCard";
import { useToast } from "@/app/ToastProvider";
import { ApiError, SUPPORTS_UPLOADS } from "@/services";
import { errorMessage, storeUrl } from "@/lib/utils";

export default function BusinessPage() {
  const biz = useBusiness();
  const items = useCatalog();
  const save = useSaveBusiness();
  const publish = usePublish();
  const unpublish = useUnpublish();
  const copy = useCopy();
  const upload = useUploadLogo();
  const removeLogo = useRemoveLogo();
  const { toast } = useToast();
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [error, setError] = useState<string | null>(null);
  const { register, control, handleSubmit, reset, watch, setValue, setError: setFieldError, formState: { errors, isDirty } } = useForm<BusinessFormValues>({ resolver: zodResolver(businessSchema), mode: "onTouched" });

  useEffect(() => { if (biz.data) reset({ ...biz.data }); }, [biz.data, reset]);
  if (biz.isLoading) return <Loading />;
  if (biz.isError || !biz.data) return <ErrorState message={errorMessage(biz.error)} onRetry={() => biz.refetch()} />;
  const b = biz.data;
  const published = b.status === "PUBLISHED";
  const v = watch();

  const onSave = handleSubmit(async (values) => {
    setError(null);
    try { await save.mutateAsync(values); toast("Changes saved."); }
    catch (e) { if (e instanceof ApiError && e.fields) Object.entries(e.fields).forEach(([k, m]) => setFieldError(k as keyof BusinessFormValues, { message: m })); setError(errorMessage(e)); }
  });
  const onLogo = async (file: File | undefined) => {
    if (!file) return;
    try { await upload.mutateAsync(file); toast("Logo updated."); }
    catch (e) { toast(e instanceof ApiError && e.fields?.logo ? e.fields.logo : errorMessage(e), "error"); } // show the specific reason, not the generic one
  };
  const toggle = async () => {
    try {
      if (isDirty) await onSave();
      if (published) { await unpublish.mutateAsync(undefined); toast("Storefront unpublished. It is now a private draft."); }
      else { await publish.mutateAsync(undefined); toast("Storefront published."); }
    } catch (e) { toast(errorMessage(e), "error"); }
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "My storefront" }]} />
      <PageHeader title="My storefront" subtitle="Edit your profile and see exactly what customers will see."
        actions={<>
          <Link to={`/store/${b.slug}${published ? "" : "?preview=1"}`} className={buttonClass("secondary", "md")}><Eye className="h-4 w-4" aria-hidden />{published ? "View live" : "Open preview"}</Link>
          <Button onClick={toggle} variant={published ? "ghost" : "primary"} loading={publish.isPending || unpublish.isPending}>{published ? "Unpublish" : "Publish"}</Button>
        </>} />
      <div className="mb-4 flex flex-wrap items-center gap-2"><Badge tone={published ? "green" : "amber"}>{published ? "Published: public" : "Draft: only you can see it"}</Badge>{isDirty && <Badge tone="neutral">Unsaved changes</Badge>}</div>

      <div role="tablist" aria-label="Editor view" className="mb-4 flex gap-2 lg:hidden">
        {(["edit", "preview"] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`min-h-[44px] flex-1 rounded-xl font-semibold ${tab === t ? "bg-ocean-900 text-white" : "bg-white text-ocean-700"}`}>{t === "edit" ? "Edit" : "Preview"}</button>)}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={onSave} noValidate className={`space-y-6 ${tab === "preview" ? "hidden lg:block" : ""}`}>
          {error && <p role="alert" className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">{error}</p>}
          <section className="card space-y-4 p-5">
            <h2 className="text-lg font-bold">Business</h2>
            <TextField label="Business name" error={errors.name?.message} {...register("name")} />
            <Controller control={control} name="category" render={({ field }) => <CategoryPicker value={field.value} onChange={field.onChange} error={errors.category?.message} />} />
            <TextArea label="Short description" error={errors.description?.message} {...register("description")} />
          </section>
          {SUPPORTS_UPLOADS && (
            <section className="card space-y-3 p-5" aria-label="Logo">
              <h2 className="text-lg font-bold">Logo (optional)</h2>
              <div className="flex items-center gap-4">
                {b.logoUrl ? <img src={b.logoUrl} alt="Your current logo" width={64} height={64} className="h-16 w-16 rounded-xl border border-sand-200 object-cover" /> : <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-sand-100 text-xs text-ocean-500">No logo</span>}
                <div className="space-y-2">
                  <label className={`${buttonClass("secondary", "sm")} cursor-pointer`}>
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Choose a logo image" onChange={(e) => { onLogo(e.target.files?.[0]); e.target.value = ""; }} disabled={upload.isPending} />
                    {upload.isPending ? "Uploading…" : b.logoUrl ? "Replace logo" : "Upload logo"}
                  </label>
                  {b.logoUrl && <Button size="sm" variant="ghost" loading={removeLogo.isPending} onClick={async () => { try { await removeLogo.mutateAsync(undefined); toast("Logo removed."); } catch (e) { toast(errorMessage(e), "error"); } }}>Remove</Button>}
                </div>
              </div>
              <p className="text-sm text-ocean-600">JPEG, PNG or WebP, up to 2 MB. The image is checked, resized and stripped of hidden data such as location before it is saved.</p>
            </section>
          )}
          <section className="card space-y-4 p-5">
            <h2 className="text-lg font-bold">Location</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="County" error={errors.county?.message} {...register("county")}>{COUNTIES.map((c) => <option key={c}>{c}</option>)}</SelectField>
              <TextField label="Town or area" error={errors.town?.message} {...register("town")} />
            </div>
            <TextField label="Public address (optional)" error={errors.publicAddress?.message} {...register("publicAddress")} />
          </section>
          <section className="card space-y-4 p-5">
            <h2 className="text-lg font-bold">Contact</h2>
            <div className="grid gap-4 sm:grid-cols-2"><TextField label="Phone" type="tel" error={errors.phone?.message} {...register("phone")} /><TextField label="WhatsApp" type="tel" error={errors.whatsapp?.message} {...register("whatsapp")} /></div>
            <TextField label="Email" type="email" error={errors.email?.message} {...register("email")} />
            <div className="space-y-3 rounded-xl bg-sand-100 p-4"><CheckField label="Show phone and WhatsApp publicly" {...register("showPhone")} /><CheckField label="Show email publicly" {...register("showEmail")} /></div>
          </section>
          <section className="card space-y-4 p-5">
            <h2 className="text-lg font-bold">Hours and prices</h2>
            <HoursEditor value={v.hours ?? b.hours} onChange={(h) => setValue("hours", h, { shouldDirty: true })} />
            <CheckField label="Show prices on my storefront" hint="Turn off to show “Ask for price” instead." {...register("showPrices")} />
          </section>
          <Button type="submit" size="lg" className="w-full sm:w-auto" loading={save.isPending}><Save className="h-4 w-4" aria-hidden />Save changes</Button>
        </form>

        <div className={`space-y-6 ${tab === "edit" ? "hidden lg:block" : ""}`}>
          <section className="card overflow-hidden" aria-label="Live preview">
            <p className="border-b border-sand-200 bg-sand-50 px-4 py-2 text-sm font-semibold text-ocean-700">Live preview of your edits</p>
            <div className="max-h-[36rem] overflow-y-auto"><StorefrontView mode="preview" business={toPublicBusiness({ ...b, ...v, hours: v.hours ?? b.hours })} items={(items.data ?? []).map((i) => toPublicItem(i, v.showPrices ?? b.showPrices))} /></div>
          </section>
          <section className="card p-5">
            <h2 className="text-lg font-bold">Share your storefront</h2>
            {published ? (<><p className="mb-4 mt-1 text-sm text-ocean-600">Anyone with this link can see your storefront.</p><QrCard url={storeUrl(b.slug)} name={b.name} /></>) : (
              <p className="mt-2 text-ocean-700">Your link and QR code appear here once you publish. The link will be <span className="break-all font-mono text-sm">{storeUrl(b.slug)}</span> and it stays the same if you rename your business.</p>
            )}
            {!published && <Button variant="secondary" className="mt-3" onClick={() => copy(storeUrl(b.slug), "Preview link")}>Copy link</Button>}
          </section>
        </div>
      </div>
    </div>
  );
}
