import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, Clock, ListChecks, Loader2, RotateCcw, Target, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api.js';
import { ErrorState, Loading } from '../components/States.jsx';

const fmtTime = (s) => (s == null ? '—' : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`);

function Ring({ value }) {
  const r = 52, c = 2 * Math.PI * r;
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

export default function Results() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [view, setView] = useState(null);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    api.getAttempt(attemptId).then((v) => {
      if (!v.submittedAt) navigate(`/attempt/${attemptId}`, { replace: true });
      else setView(v);
    }).catch((e) => setError(e.message));
  }, [attemptId, navigate]);

  if (error) return <ErrorState message={error} />;
  if (!view) return <Loading label="Loading results…" />;

  const { result: r } = view;
  const keyText = (q, keys) => keys.map((k) => `${k}. ${q.options.find((o) => o.key === k)?.text ?? ''}`);

  async function retry() {
    setRetrying(true);
    try {
      const a = await api.createAttempt(view.assignment.assignmentId, view.orderMode);
      navigate(`/attempt/${a.attemptId}`);
    } catch (e) { toast.error(e.message); setRetrying(false); }
  }

  const stats = [
    { label: 'Attempted', value: r.answered, icon: Target },
    { label: 'Correct', value: r.correct, icon: Check },
    { label: 'Incorrect', value: r.incorrect, icon: X },
    { label: 'Time taken', value: fmtTime(r.timeTakenSeconds), icon: Clock },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Practice complete</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{view.assignment?.title}</h1>

      <section aria-label="Summary" className="card mt-6 flex flex-col items-center gap-6 p-6 sm:flex-row">
        <Ring value={r.accuracy} />
        <div className="grid w-full flex-1 grid-cols-2 gap-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"><Icon size={14} aria-hidden="true" /> {label}</p>
              <p className="mt-1 text-xl font-bold">{value}{typeof value === 'number' && label !== 'Attempted' ? <span className="text-sm font-medium text-slate-500"> / {r.total}</span> : null}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" className="btn-primary" onClick={retry} disabled={retrying}>
          {retrying ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <RotateCcw size={16} aria-hidden="true" />} Retry Assignment
        </button>
        <Link to="/assignments" className="btn-secondary">Back to Assignments</Link>
      </div>

      <section aria-labelledby="review" className="mt-10">
        <h2 id="review" className="mb-4 text-xl font-bold">Review</h2>
        <ol className="space-y-4">
          {view.questions.map((q, i) => {
            const c = view.checks[q.questionId];
            return (
              <li key={q.questionId} className="card p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Question {i + 1} <span className="font-normal">(original #{q.questionNumber})</span></p>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${c?.isCorrect
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'}`}>
                    {c?.isCorrect ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}{c?.isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
                {q.type === 'multiple' && (
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    <ListChecks size={14} aria-hidden="true" /> Multiple Correct Answers
                  </span>
                )}
                <p className="mt-2 whitespace-pre-line break-words font-semibold">{q.questionText}</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div><dt className="font-medium text-slate-500 dark:text-slate-400">{c.selected.length > 1 ? 'Your answers' : 'Your answer'}</dt>
                    {keyText(q, c.selected).map((t) => <dd key={t} className={c.isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}>{t}</dd>)}</div>
                  {!c.isCorrect && (
                    <div><dt className="font-medium text-slate-500 dark:text-slate-400">{c.correctAnswers.length > 1 ? 'Correct answers' : 'Correct answer'}</dt>
                      {keyText(q, c.correctAnswers).map((t) => <dd key={t} className="text-emerald-700 dark:text-emerald-300">{t}</dd>)}</div>
                  )}
                  <div><dt className="font-medium text-slate-500 dark:text-slate-400">Explanation</dt>
                    <dd className="whitespace-pre-line leading-relaxed">{c.explanation}</dd></div>
                </dl>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
