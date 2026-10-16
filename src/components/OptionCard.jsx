import { Check, X } from 'lucide-react';

/**
 * One answer option. A native radio/checkbox input keeps keyboard + screen-reader behaviour for free.
 * After checking, state is shown with icon + text label (not colour alone).
 *   status: undefined (not checked) | 'correct' | 'wrong' | 'missed'
 */
export default function OptionCard({ option, name, multiple, selected, status, disabled, onChange }) {
  const base = 'group relative flex min-h-[52px] cursor-pointer items-start gap-3 rounded-xl border-2 p-3.5 transition-colors sm:p-4 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-slate-50 dark:focus-within:ring-offset-slate-950';
  const tone = {
    correct: 'border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/60',
    wrong: 'border-rose-500 bg-rose-50 dark:border-rose-500 dark:bg-rose-950/60',
    missed: 'border-dashed border-emerald-500 bg-white dark:border-emerald-500 dark:bg-slate-900',
  }[status] || (selected
    ? 'border-indigo-600 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/60'
    : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500 dark:hover:bg-slate-800');
  const badge = status === 'correct' ? 'bg-emerald-600 text-white'
    : status === 'wrong' ? 'bg-rose-600 text-white'
    : selected ? 'bg-indigo-600 text-white dark:bg-indigo-500'
    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  const label = { correct: 'Correct', wrong: 'Incorrect', missed: 'Correct answer' }[status];

  return (
    <label className={`${base} ${tone} ${disabled ? 'cursor-default' : ''}`}>
      <input type={multiple ? 'checkbox' : 'radio'} name={name} value={option.key} checked={selected}
        disabled={disabled} onChange={() => onChange(option.key)} className="peer sr-only" />
      <span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${badge}`}>{option.key}</span>
      <span className="flex-1 whitespace-pre-line break-words pt-0.5 text-[15px] leading-snug sm:text-base">{option.text}</span>
      {label && (
        <span className={`flex shrink-0 items-center gap-1 pt-0.5 text-xs font-semibold ${status === 'wrong' ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
          {status === 'wrong' ? <X size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
          <span>{label}</span>
        </span>
      )}
    </label>
  );
}
