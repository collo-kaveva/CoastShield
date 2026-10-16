import { useState } from "react";
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

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name."),
  email: z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
  agree: z.literal(true, { errorMap: () => ({ message: "Please confirm to continue." }) }),
});
type Values = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: signUp } = useAuthActions();
  const nav = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setError: setFieldError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });

  const submit = handleSubmit(async ({ name, email, password }) => {
    setError(null);
    try { await signUp.mutateAsync({ name, email, password }); toast("Account created. Let's set up your business."); nav("/onboarding", { replace: true }); }
    catch (e) {
      if (e instanceof ApiError && e.fields) Object.entries(e.fields).forEach(([k, m]) => setFieldError(k as keyof Values, { message: m }));
      setError(errorMessage(e));
    }
  });

  return (
    <div>
      <div className="mb-6 flex justify-end"><LanguageSwitcher /></div>
      <h1 className="text-3xl font-bold">Create your free account</h1>
      <p className="mt-1 text-navy-600">It takes about two minutes to get your storefront ready.</p>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        {error && <p role="alert" className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700">{error}</p>}
        <TextField label="Your name" autoComplete="name" error={errors.name?.message} {...register("name")} />
        <TextField label="Email address" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
        <PasswordField label="Password" autoComplete="new-password" hint="At least 8 characters. Use a password you do not use anywhere else." error={errors.password?.message} {...register("password")} />
        <div>
          <CheckField label="I understand this is a demo and agree to the privacy notice" hint="CoastShield collects only what is needed to run your storefront." {...register("agree")} />
          {errors.agree && <p role="alert" className="mt-1.5 text-sm font-medium text-coral-700">{errors.agree.message}</p>}
        </div>
        <Button type="submit" size="lg" className="w-full" loading={signUp.isPending}>Create account</Button>
      </form>
      <p className="mt-4 text-center text-sm text-navy-600"><Link to="/privacy" className="underline">Read the privacy notice</Link></p>
      <p className="mt-4 text-center text-navy-700">Already have an account? <Link to="/login" className="font-semibold text-teal-800 underline">Sign in</Link></p>
    </div>
  );
}
