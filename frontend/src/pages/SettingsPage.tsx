import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthActions, useMe, useResetDemo } from "@/hooks/queries";
import { Breadcrumbs, PageHeader } from "@/components/common/States";
import { Button } from "@/components/common/Button";
import { TextField } from "@/components/common/Fields";
import { ConfirmDialog } from "@/components/common/Modal";
import { useToast } from "@/app/ToastProvider";
import { errorMessage } from "@/lib/utils";
import { IS_DEMO } from "@/services";

const schema = z.object({ name: z.string().trim().min(2, "Enter your name.") });

export default function SettingsPage() {
  const me = useMe();
  const { profile, logout } = useAuthActions();
  const reset = useResetDemo();
  const nav = useNavigate();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), values: { name: me.data?.name ?? "" } });

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Settings" }]} />
      <PageHeader title="Account settings" />
      <div className="max-w-xl space-y-6">
        <form onSubmit={handleSubmit(async (v) => { try { await profile.mutateAsync(v.name); toast("Profile updated."); } catch (e) { toast(errorMessage(e), "error"); } })} noValidate className="card space-y-4 p-5">
          <h2 className="text-lg font-bold">Profile</h2>
          <TextField label="Your name" error={errors.name?.message} {...register("name")} />
          <TextField label="Email address" value={me.data?.email ?? ""} readOnly disabled hint="Your sign-in email cannot be changed in the demo." />
          <Button type="submit" loading={profile.isPending} disabled={!isDirty}>Save profile</Button>
        </form>
        <section className="card p-5">
          <h2 className="text-lg font-bold">Language</h2>
          <p className="mt-1 text-ocean-700">English. Swahili is planned for a later version.</p>
        </section>
        <section className="card p-5">
          <h2 className="text-lg font-bold">Privacy</h2>
          <p className="mt-1 text-ocean-700">{IS_DEMO ? "In demo mode, everything is stored only in this browser. " : "Your account and storefront data are stored on the CoastShield server. "}The message checker does not save what you paste.</p>
        </section>
        <section className="card space-y-3 p-5">
          <h2 className="text-lg font-bold">{IS_DEMO ? "Session and demo data" : "Session"}</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" loading={logout.isPending} onClick={async () => { await logout.mutateAsync(); toast("You have signed out."); nav("/"); }}>Sign out</Button>
            {IS_DEMO && <Button variant="danger" onClick={() => setConfirm(true)}>Reset demo data</Button>}
          </div>
          {IS_DEMO && <p className="text-sm text-ocean-600">Resetting erases everything stored in this browser and restores the sample account.</p>}
        </section>
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} loading={reset.isPending} danger title="Reset all demo data?" confirmLabel="Erase and reset" message="All accounts, storefronts, orders and checklist progress created in this browser will be erased."
        onConfirm={async () => { await reset.mutateAsync(undefined); toast("Demo data reset."); nav("/login"); }} />
    </div>
  );
}
