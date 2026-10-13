import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface Props { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }

/** Native <dialog>: gives focus trapping, Esc to close and an inert background for free. */
export function Modal({ open, onClose, title, children, footer, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} aria-labelledby={titleId} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className={`m-auto max-h-[90vh] w-[calc(100%-1.5rem)] ${wide ? "max-w-2xl" : "max-w-lg"} overflow-hidden rounded-2xl p-0 shadow-lift`}>
      {open && (
        <div className="flex max-h-[90vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-sand-200 px-5 py-4">
            <h2 id={titleId} className="text-xl font-bold text-ocean-900">{title}</h2>
            <button onClick={onClose} aria-label="Close dialog" className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-ocean-600 hover:bg-ocean-50"><X className="h-5 w-5" /></button>
          </div>
          <div className="overflow-y-auto px-5 py-5">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-sand-200 bg-sand-50 px-5 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, danger, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: ReactNode; confirmLabel: string; danger?: boolean; loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<><Button variant="secondary" onClick={onClose}>Not now</Button><Button variant={danger ? "danger" : "primary"} loading={loading} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <div className="text-base text-ocean-700">{message}</div>
    </Modal>
  );
}
