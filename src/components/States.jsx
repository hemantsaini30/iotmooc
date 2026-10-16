import { AlertCircle, Loader2 } from 'lucide-react';

export function Loading({ label = 'Loading…' }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-slate-600 dark:text-slate-400">
      <Loader2 className="animate-spin" size={22} aria-hidden="true" /> <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="card flex flex-col items-center gap-3 p-8 text-center">
      <AlertCircle className="text-rose-600 dark:text-rose-400" size={28} aria-hidden="true" />
      <p className="font-medium">Something went wrong</p>
      <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>
      {onRetry && <button type="button" className="btn-primary" onClick={onRetry}>Try again</button>}
    </div>
  );
}
