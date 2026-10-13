import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Common { label: string; error?: string; hint?: string }

function Wrap({ id, label, error, hint, children }: Common & { id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ocean-800">{label}</label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-sm text-ocean-600">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm font-medium text-coral-700">{error}</p>}
    </div>
  );
}
const aria = (id: string, error?: string, hint?: string) => ({
  id, "aria-invalid": error ? true : undefined, "aria-describedby": error ? `${id}-err` : hint ? `${id}-hint` : undefined,
});

export const TextField = forwardRef<HTMLInputElement, Common & InputHTMLAttributes<HTMLInputElement>>(function TextField({ label, error, hint, className, ...rest }, ref) {
  const id = useId();
  return <Wrap id={id} label={label} error={error} hint={hint}><input ref={ref} className={cn("field-input", className)} {...aria(id, error, hint)} {...rest} /></Wrap>;
});

export const PasswordField = forwardRef<HTMLInputElement, Common & InputHTMLAttributes<HTMLInputElement>>(function PasswordField({ label, error, hint, ...rest }, ref) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <Wrap id={id} label={label} error={error} hint={hint}>
      <div className="relative">
        <input ref={ref} type={show ? "text" : "password"} className="field-input pr-12" {...aria(id, error, hint)} {...rest} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-ocean-600 hover:text-ocean-900">
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </Wrap>
  );
});

export const TextArea = forwardRef<HTMLTextAreaElement, Common & TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({ label, error, hint, className, ...rest }, ref) {
  const id = useId();
  return <Wrap id={id} label={label} error={error} hint={hint}><textarea ref={ref} className={cn("field-input min-h-[96px]", className)} {...aria(id, error, hint)} {...rest} /></Wrap>;
});

export const SelectField = forwardRef<HTMLSelectElement, Common & SelectHTMLAttributes<HTMLSelectElement>>(function SelectField({ label, error, hint, children, ...rest }, ref) {
  const id = useId();
  return <Wrap id={id} label={label} error={error} hint={hint}><select ref={ref} className="field-input" {...aria(id, error, hint)} {...rest}>{children}</select></Wrap>;
});

export const CheckField = forwardRef<HTMLInputElement, { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>>(function CheckField({ label, hint, ...rest }, ref) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input ref={ref} id={id} type="checkbox" className="mt-1 h-5 w-5 shrink-0 rounded border-ocean-300 accent-lagoon-700" aria-describedby={hint ? `${id}-hint` : undefined} {...rest} />
      <label htmlFor={id} className="text-base text-ocean-800">
        <span className="font-medium">{label}</span>
        {hint && <span id={`${id}-hint`} className="block text-sm text-ocean-600">{hint}</span>}
      </label>
    </div>
  );
});
