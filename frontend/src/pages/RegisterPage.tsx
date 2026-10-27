import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthActions } from "@/hooks/queries";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { CheckField, PasswordField, TextField } from "@/components/common/Fields";
import { Button } from "@/components/common/Button";
import { useToast } from "@/app/ToastProvider";
import { ApiError } from "@/services";
import { errorMessage } from "@/lib/utils";

export default function RegisterPage() {
  const { t } = useTranslation();

  const schema = z.object({
    name: z.string().trim().min(2, t("auth.enterName")),
    email: z.string().trim().min(1, t("auth.enterEmail")).email(t("auth.validEmail")),
    password: z.string().min(8, t("auth.passwordLength")),
    agree: z.literal(true, { errorMap: () => ({ message: t("auth.confirmToContinue") }) }),
  });
  type Values = z.infer<typeof schema>;

  const { register: signUp } = useAuthActions();
  const nav = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setError: setFieldError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });

  const submit = handleSubmit(async ({ name, email, password }) => {
    setError(null);
    try { await signUp.mutateAsync({ name, email, password }); toast(t("auth.createAccountTitle") + ". " + t("auth.createAccountSubtitle")); nav("/onboarding", { replace: true }); }
    catch (e) {
      if (e instanceof ApiError && e.fields) Object.entries(e.fields).forEach(([k, m]) => setFieldError(k as keyof Values, { message: m }));
      setError(errorMessage(e));
    }
  });

  return (
    <div>
      <div className="mb-6 flex justify-end"><LanguageSwitcher /></div>
      <h1 className="text-3xl font-bold">{t("auth.createAccountTitle")}</h1>
      <p className="mt-1 text-navy-600">{t("auth.createAccountSubtitle")}</p>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        {error && <p role="alert" className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">{error}</p>}
        <TextField label={t("auth.yourName")} autoComplete="name" error={errors.name?.message} {...register("name")} />
        <TextField label={t("auth.emailAddress")} type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
        <PasswordField label={t("auth.password")} autoComplete="new-password" hint={t("auth.passwordHint")} error={errors.password?.message} {...register("password")} />
        <div>
          <CheckField label={t("auth.agreePrivacy")} hint={t("auth.agreePrivacyHint")} {...register("agree")} />
          {errors.agree && <p role="alert" className="mt-1.5 text-sm font-medium text-coral-700">{errors.agree.message}</p>}
        </div>
        <Button type="submit" size="lg" className="w-full" loading={signUp.isPending}>{t("auth.createAccount")}</Button>
      </form>
      <p className="mt-4 text-center text-sm text-navy-600"><Link to="/privacy" className="underline">{t("auth.privacyNotice")}</Link></p>
      <p className="mt-4 text-center text-navy-700">{t("auth.hasAccount")} <Link to="/login" className="font-semibold text-teal-800 underline">{t("auth.signIn")}</Link></p>
    </div>
  );
}
