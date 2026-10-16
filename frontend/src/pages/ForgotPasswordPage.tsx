import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import { useAuthActions } from "@/hooks/queries";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { TextField } from "@/components/common/Fields";
import { Button } from "@/components/common/Button";

const schema = z.object({ email: z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address.") });

export default function ForgotPasswordPage() {
  const { reset } = useAuthActions();
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  if (sent) return (
    <div className="text-center">
      <div className="mb-6 flex justify-end"><LanguageSwitcher /></div>
      <MailCheck className="mx-auto h-12 w-12 text-teal-700" aria-hidden />
      <h1 className="mt-3 text-3xl font-bold">Check your email</h1>
      <p className="mt-2 text-navy-600">If an account exists for that address, a reset link would be sent. We show the same message either way so nobody can use this form to find out who has an account.</p>
      <p className="mt-2 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-700">Demo mode: no email is actually sent.</p>
      <Link to="/login" className="mt-6 inline-block font-semibold text-teal-800 underline">Back to sign in</Link>
    </div>
  );
  return (
    <div>
      <div className="mb-6 flex justify-end"><LanguageSwitcher /></div>
      <h1 className="text-3xl font-bold">Reset your password</h1>
      <p className="mt-1 text-navy-600">Enter the email you registered with.</p>
      <form onSubmit={handleSubmit(async (v) => { await reset.mutateAsync(v.email); setSent(true); })} noValidate className="mt-6 space-y-4">
        <TextField label="Email address" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
        <Button type="submit" size="lg" className="w-full" loading={reset.isPending}>Send reset link</Button>
      </form>
      <p className="mt-6 text-center"><Link to="/login" className="font-semibold text-teal-800 underline">Back to sign in</Link></p>
    </div>
  );
}
