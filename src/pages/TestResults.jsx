import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, Clock, ListChecks, Loader2, MinusCircle, RotateCcw, Target, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api.js';
import ScoreRing from '../components/ScoreRing.jsx';
import { ErrorState, Loading } from '../components/States.jsx';

const fmtTime = (s) => (s == null ? '—' : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`);

export default function TestResults() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [view, setView] = useState(null);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    api.getTest(attemptId).then((v) => {
      if (!v.submittedAt) navigate(`/tests/${attemptId}`, { replace: true });
      else setView(v);
    }).catch((e) => setError(e.message));
  }, [attemptId, navigate]);

  if (error) return <ErrorState message={error} />;
  if (!view) return <Loading label="Loading results…" />;

  const { result: r, review } = view;
  const keyText = (q, keys) => keys.map((k) => `${k}. ${q.options.find((o) => o.key === k)?.text ?? ''}`);

  async function another() {
    setStarting(true);
    try {
      const t = await api.createTest(view.testLength);
      navigate(`/tests/${t.attemptId}`);
    } catch (e) { toast.error(e.message); setStarting(false); }
  }

  const stats = [
    { label: 'Total questions', value: r.total, icon: Target },
    { label: 'Correct', value: r.correct, icon: Check },
    { label: 'Incorrect', value: r.incorrect, icon: X },
    { label: 'Skipped', value: r.skipped, icon: MinusCircle },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Test submitted</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{r.total}-question test</h1>

      <section aria-label="Summary" className="card mt-6 flex flex-col items-center gap-6 p-6 sm:flex-row">
        <ScoreRing value={r.accuracy} />
        <div className="grid w-full flex-1 grid-cols-2 gap-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"><Icon size={14} aria-hidden="true" /> {label}</p>
              <p className="mt-1 text-xl font-bold">{value}</p>
            </div>
          ))}
          <div className="col-span-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"><Clock size={14} aria-hidden="true" /> Time taken</p>
            <p className="mt-1 text-xl font-bold">{fmtTime(r.timeTakenSeconds)}</p>
          </div>
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" className="btn-primary" onClick={another} disabled={starting}>
          {starting ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <RotateCcw size={16} aria-hidden="true" />} Start Another Test
        </button>
        <Link to="/tests" className="btn-secondary">Back to Tests</Link>
      </div>

      <section aria-labelledby="review" className="mt-10">
        <h2 id="review" className="mb-1 text-xl font-bold">Review</h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">Incorrect and skipped questions only.</p>
        {review.length === 0 ? (
          <p className="card p-6 text-center font-medium">Perfect score — nothing to review.</p>
        ) : (
          <ol className="space-y-4">
            {review.map((q) => (
              <li key={q.questionId} className="card p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Question {q.number} <span className="font-normal">of {r.total}</span></p>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${q.status === 'skipped'
                    ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'}`}>
                    {q.status === 'skipped' ? <MinusCircle size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
                    {q.status === 'skipped' ? 'Skipped' : 'Incorrect'}
                  </span>
                </div>
                {q.type === 'multiple' && (
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    <ListChecks size={14} aria-hidden="true" /> Multiple Correct Answers
                  </span>
                )}
                <p className="mt-2 whitespace-pre-line break-words font-semibold">{q.questionText}</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="font-medium text-slate-500 dark:text-slate-400">{q.selected.length > 1 ? 'Your answers' : 'Your answer'}</dt>
                    {q.status === 'skipped'
                      ? <dd className="font-medium">Skipped — no answer selected</dd>
                      : keyText(q, q.selected).map((t) => <dd key={t} className="text-rose-700 dark:text-rose-300">{t}</dd>)}
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500 dark:text-slate-400">{q.correctAnswers.length > 1 ? 'Correct answers' : 'Correct answer'}</dt>
                    {keyText(q, q.correctAnswers).map((t) => <dd key={t} className="text-emerald-700 dark:text-emerald-300">{t}</dd>)}
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500 dark:text-slate-400">Explanation</dt>
                    <dd className="whitespace-pre-line leading-relaxed">{q.explanation}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}