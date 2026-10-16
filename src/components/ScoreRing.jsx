// Circular accuracy indicator (same look as the assignment results screen).
export default function ScoreRing({ value }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-slate-200 dark:stroke-slate-800" />
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)} className="stroke-indigo-600 transition-all duration-700 dark:stroke-indigo-400" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold">{value}%</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">accuracy</span>
      </div>
    </div>
  );
}