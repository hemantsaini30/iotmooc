import { useEffect, useRef } from 'react';

// Accessible modal built on the native <dialog> element (focus trap + Esc handled by the browser).
export default function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = 'Cancel', onConfirm, onCancel, danger }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onCancel={(e) => { e.preventDefault(); onCancel(); }}
      className="w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <div className="p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" onClick={onConfirm}
            className={danger ? 'btn bg-rose-600 text-white hover:bg-rose-700' : 'btn-primary'}>{confirmLabel}</button>
        </div>
      </div>
    </dialog>
  );
}
