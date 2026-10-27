import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthActions } from "@/hooks/queries";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { PasswordField, TextField } from "@/components/common/Fields";
import { Button } from "@/components/common/Button";
import { useToast } from "@/app/ToastProvider";
import { errorMessage } from "@/lib/utils";
import { SHOW_SAMPLE_LOGIN } from "@/services";

export default function LoginPage() {
  const { t } = useTranslation();

  const schema = z.object({ email: z.string().trim().min(1, t("auth.enterEmail")).email(t("auth.validEmail")), password: z.string().min(1, t("auth.enterPassword")) });
  type Values = z.infer<typeof schema>;

  const { login } = useAuthActions();
  const nav = useNavigate();
  const loc = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });
  const dest = (loc.state as { from?: string } | null)?.from ?? "/dashboard";

  const go = async (v: Values) => {
    setError(null);
    try { const u = await login.mutateAsync(v); toast(`${t("auth.welcomeBack")}, ${u.name.split(" ")[0]}.`); nav(u.role === "ADMIN" ? "/admin" : dest, { replace: true }); }
    catch (e) { setError(errorMessage(e)); }
  };

  return (
    <div>
      <div className="mb-6 flex justify-end"><LanguageSwitcher /></div>
      <h1 className="text-3xl font-bold">{t("auth.signIn")}</h1>
      <p className="mt-1 text-navy-600">{t("auth.signInSubtitle")}</p>
      <form onSubmit={handleSubmit(go)} noValidate className="mt-6 space-y-4">
        {error && <p role="alert" className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">{error}</p>}
        <TextField label={t("auth.emailAddress")} type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
        <PasswordField label={t("auth.password")} autoComplete="current-password" error={errors.password?.message} {...register("password")} />
        <div className="text-right"><Link to="/forgot-password" className="text-sm font-semibold text-teal-800 underline">{t("auth.forgotYourPassword")}</Link></div>
        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>{t("auth.signIn")}</Button>
      </form>
      {SHOW_SAMPLE_LOGIN && <>
      <div className="my-6 flex items-center gap-3 text-sm text-sand-500"><span className="h-px flex-1 bg-sand-300" />or<span className="h-px flex-1 bg-sand-300" /></div>
      <div className="card p-4">
        <p className="font-semibold">{t("auth.trySample")}</p>
        <p className="mt-0.5 text-sm text-navy-600">{t("auth.sampleDescription")}</p>
        <Button variant="secondary" className="mt-3 w-full" loading={login.isPending} onClick={() => go({ email: "fatuma@example.com", password: "demo-password" })}>{t("auth.useSampleAccount")}</Button>
      </div>
      </>}
      <p className="mt-6 text-center text-navy-700">{t("auth.noAccount")} <Link to="/register" className="font-semibold text-teal-800 underline">{t("auth.createAccount")}</Link></p>
    </div>
  );
}
