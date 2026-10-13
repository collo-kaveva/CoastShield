import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthActions } from "@/hooks/queries";
import { PasswordField, TextField } from "@/components/common/Fields";
import { Button } from "@/components/common/Button";
import { useToast } from "@/app/ToastProvider";
import { errorMessage } from "@/lib/utils";
import { SHOW_SAMPLE_LOGIN } from "@/services";

const schema = z.object({ email: z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address."), password: z.string().min(1, "Enter your password.") });
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuthActions();
  const nav = useNavigate();
  const loc = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });
  const dest = (loc.state as { from?: string } | null)?.from ?? "/dashboard";

  const go = async (v: Values) => {
    setError(null);
    try { const u = await login.mutateAsync(v); toast(`Welcome back, ${u.name.split(" ")[0]}.`); nav(dest, { replace: true }); }
    catch (e) { setError(errorMessage(e)); }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">Sign in</h1>
      <p className="mt-1 text-ocean-600">Manage your storefront, orders and security tools.</p>
      <form onSubmit={handleSubmit(go)} noValidate className="mt-6 space-y-4">
        {error && <p role="alert" className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">{error}</p>}
        <TextField label="Email address" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
        <PasswordField label="Password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
        <div className="text-right"><Link to="/forgot-password" className="text-sm font-semibold text-lagoon-800 underline">Forgot your password?</Link></div>
        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>Sign in</Button>
      </form>
      {SHOW_SAMPLE_LOGIN && <>
      <div className="my-6 flex items-center gap-3 text-sm text-ocean-500"><span className="h-px flex-1 bg-sand-300" />or<span className="h-px flex-1 bg-sand-300" /></div>
      <div className="card p-4">
        <p className="font-semibold">Try the sample account</p>
        <p className="mt-0.5 text-sm text-ocean-600">Explore a fish trader's storefront with sample orders. All records are fictional.</p>
        <Button variant="secondary" className="mt-3 w-full" loading={login.isPending} onClick={() => go({ email: "fatuma@example.com", password: "demo-password" })}>Use sample account</Button>
      </div>
      </>}
      <p className="mt-6 text-center text-ocean-700">New here? <Link to="/register" className="font-semibold text-lagoon-800 underline">Create a free account</Link></p>
    </div>
  );
}
