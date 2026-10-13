import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EyeOff, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useBusiness, useCatalog, useCreateItem, useDeleteItem, useUpdateItem } from "@/hooks/queries";
import { Badge, Breadcrumbs, EmptyState, ErrorState, Loading, PageHeader } from "@/components/common/States";
import { Button } from "@/components/common/Button";
import { CheckField, TextArea, TextField } from "@/components/common/Fields";
import { ConfirmDialog, Modal } from "@/components/common/Modal";
import { useToast } from "@/app/ToastProvider";
import { ApiError } from "@/services";
import { cn, errorMessage, formatKes } from "@/lib/utils";
import type { CatalogItem } from "@/types";

const schema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(80),
  description: z.string().trim().max(200, "Keep it under 200 characters."),
  category: z.string().trim().max(40),
  price: z.string().trim().refine((v) => v === "" || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 10_000_000), "Enter a price like 450 or leave it empty."),
  available: z.boolean(), trackStock: z.boolean(),
  quantity: z.string().trim(),
}).refine((v) => !v.trackStock || /^\d+$/.test(v.quantity), { path: ["quantity"], message: "Enter a whole number of 0 or more." });
type Values = z.infer<typeof schema>;

const empty: Values = { name: "", description: "", category: "Items", price: "", available: true, trackStock: false, quantity: "" };

function ItemDialog({ item, open, onClose }: { item: CatalogItem | null; open: boolean; onClose: () => void }) {
  const create = useCreateItem();
  const update = useUpdateItem();
  const { toast } = useToast();
  const { register, handleSubmit, watch, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: item ? { name: item.name, description: item.description, category: item.category, price: item.price === null ? "" : String(item.price), available: item.available, trackStock: item.trackStock, quantity: item.quantity === null ? "" : String(item.quantity) } : empty,
  });
  const tracking = watch("trackStock");
  const pending = create.isPending || update.isPending;

  const submit = handleSubmit(async (v) => {
    const input = { name: v.name, description: v.description, category: v.category || "Items", price: v.price === "" ? null : Number(v.price), available: v.available, trackStock: v.trackStock, quantity: v.trackStock ? Number(v.quantity) : null };
    try {
      if (item) await update.mutateAsync({ id: item.id, input }); else await create.mutateAsync(input);
      toast(item ? "Item updated." : "Item added to your catalog."); onClose();
    } catch (e) {
      if (e instanceof ApiError && e.fields) Object.entries(e.fields).forEach(([k, m]) => setError(k as keyof Values, { message: m }));
      toast(errorMessage(e), "error");
    }
  });

  return (
    <Modal open={open} onClose={onClose} title={item ? "Edit item" : "Add a product or service"}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={pending}>{item ? "Save changes" : "Add item"}</Button></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <TextField label="Name" error={errors.name?.message} {...register("name")} />
        <TextArea label="Description (optional)" error={errors.description?.message} {...register("description")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Price in KES (optional)" inputMode="decimal" hint="Leave empty to show “Ask for price”." error={errors.price?.message} {...register("price")} />
          <TextField label="Group" hint="For example Fish or Services." error={errors.category?.message} {...register("category")} />
        </div>
        <CheckField label="Available right now" {...register("available")} />
        <CheckField label="Keep track of how many I have" {...register("trackStock")} />
        {tracking && <TextField label="Quantity in stock" inputMode="numeric" error={errors.quantity?.message} {...register("quantity")} />}
      </form>
    </Modal>
  );
}

export default function CatalogPage() {
  const biz = useBusiness();
  const q = useCatalog();
  const update = useUpdateItem();
  const del = useDeleteItem();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "available" | "out">("all");
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<CatalogItem | null>(null);

  const list = useMemo(() => (q.data ?? []).filter((i) => (filter === "all" || (filter === "available" ? i.available : !i.available)) && `${i.name} ${i.category}`.toLowerCase().includes(search.trim().toLowerCase())), [q.data, search, filter]);
  if (q.isLoading) return <Loading />;
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const showPrices = biz.data?.showPrices ?? true;

  const toggleAvail = async (i: CatalogItem) => {
    try { await update.mutateAsync({ id: i.id, input: { name: i.name, description: i.description, category: i.category, price: i.price, available: !i.available, trackStock: i.trackStock, quantity: i.quantity } }); toast(`${i.name} marked ${i.available ? "out of stock" : "available"}.`); }
    catch (e) { toast(errorMessage(e), "error"); }
  };
  const confirmDelete = async () => {
    if (!removing) return;
    try { await del.mutateAsync(removing.id); toast("Item removed."); setRemoving(null); } catch (e) { toast(errorMessage(e), "error"); }
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "My storefront", to: "/business" }, { label: "Catalog" }]} />
      <PageHeader title="Products & services" subtitle="What customers can see and ask for on your storefront." actions={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" aria-hidden />Add item</Button>} />
      {!showPrices && <p className="mb-4 flex items-start gap-2 rounded-xl bg-sun-50 px-4 py-3 text-sm text-sun-700"><EyeOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />Prices are hidden on your storefront. <Link to="/business" className="font-semibold underline">Change this</Link></p>}

      {(q.data?.length ?? 0) === 0 ? (
        <EmptyState icon={Package} title="Your catalog is empty" action={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" aria-hidden />Add your first item</Button>}>Add the products or services you offer. They appear on your storefront once it is published.</EmptyState>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[12rem] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ocean-500" aria-hidden /><input aria-label="Search items" placeholder="Search items" className="field-input pl-10" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <div role="group" aria-label="Filter by availability" className="flex gap-1.5">
              {([["all", "All"], ["available", "Available"], ["out", "Out of stock"]] as const).map(([k, l]) => <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k} className={cn("min-h-[44px] rounded-full border px-4 text-sm font-semibold", filter === k ? "border-ocean-900 bg-ocean-900 text-white" : "border-ocean-200 bg-white hover:bg-ocean-50")}>{l}</button>)}
            </div>
          </div>
          {list.length === 0 ? <p className="card p-6 text-center text-ocean-600">No items match your search.</p> : (
            <ul className="space-y-3">
              {list.map((i) => (
                <li key={i.id} className="card flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{i.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-bold text-lagoon-800">{i.price !== null ? formatKes(i.price) : "No price"}</span>
                      <Badge>{i.category}</Badge>
                      {i.available ? <Badge tone="green">Available</Badge> : <Badge>Out of stock</Badge>}
                      {i.trackStock && <Badge tone={i.quantity === 0 ? "red" : "teal"}>{i.quantity} in stock</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="secondary" onClick={() => toggleAvail(i)} loading={update.isPending && update.variables?.id === i.id}>{i.available ? "Mark out of stock" : "Mark available"}</Button>
                    <button onClick={() => setEditing(i)} className="flex h-11 w-11 items-center justify-center rounded-lg text-ocean-700 hover:bg-ocean-50" aria-label={`Edit ${i.name}`}><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setRemoving(i)} className="flex h-11 w-11 items-center justify-center rounded-lg text-coral-700 hover:bg-coral-50" aria-label={`Delete ${i.name}`}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <ItemDialog key={editing?.id ?? "edit"} item={editing} open={!!editing} onClose={() => setEditing(null)} />
      <ItemDialog key="add" item={null} open={adding} onClose={() => setAdding(false)} />
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} onConfirm={confirmDelete} loading={del.isPending} danger title="Delete this item?" confirmLabel="Delete item" message={<>“{removing?.name}” will be removed from your storefront. Past orders keep their own copy of the item name and price.</>} />
    </div>
  );
}
