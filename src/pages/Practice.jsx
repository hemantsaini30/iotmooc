import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Flag, ListChecks, Loader2, LogOut, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api.js';
import OptionCard from '../components/OptionCard.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { ErrorState, Loading } from '../components/States.jsx';
import { toggleSelection } from '../../lib/scoring.js';

export default function Practice() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [view, setView] = useState(null);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [drafts, setDrafts] = useState({}); // questionId -> selected keys (before checking)
  const [busy, setBusy] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);

  const load = useCallback(() => {
    setError(null);
    setView(null);
    api.getAttempt(attemptId).then((v) => {
      if (v.submittedAt) { navigate(`/attempt/${attemptId}/results`, { replace: true }); return; }
      setView(v);
      // Resume at the first unchecked question.
      const first = v.questions.findIndex((q) => !v.checks[q.questionId]);
      setIndex(first === -1 ? v.questions.length - 1 : first);
    }).catch((e) => setError(e.message));
  }, [attemptId, navigate]);
  useEffect(load, [load]);

  const question = view?.questions[index];
  const check = question ? view.checks[question.questionId] : null;
  const selected = check ? check.selected : drafts[question?.questionId] || [];
  const checkedCount = useMemo(() => (view ? Object.keys(view.checks).length : 0), [view]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!view) return <Loading label="Loading questions…" />;

  const total = view.total;
  const multiple = question.type === 'multiple';
  const isLast = index === total - 1;

  function toggle(key) {
    if (check) return;
    setDrafts((d) => {
      const cur = d[question.questionId] || [];
      return { ...d, [question.questionId]: toggleSelection(cur, key, multiple) };
    });
  }

  async function checkAnswer() {
    if (check || selected.length === 0 || busy) return;
    setBusy(true);
    try {
      const r = await api.checkAnswer(attemptId, question.questionId, selected);
      setView((v) => ({ ...v, checks: { ...v.checks, [r.questionId]: {
        selected: r.selected, isCorrect: r.isCorrect, correctAnswers: r.correctAnswers, explanation: r.explanation } } }));
    } catch (e) {
      toast.error(e.message);
      if (/already been checked/i.test(e.message)) load(); // resync with server state
    } finally { setBusy(false); }
  }

  async function finish() {
    if (busy) return;
    setBusy(true);
    try {
      await api.submitAttempt(attemptId);
      navigate(`/attempt/${attemptId}/results`);
    } catch (e) { toast.error(e.message); setBusy(false); }
  }

  const statusOf = (key) => {
    if (!check) return undefined;
    const isCorrectKey = check.correctAnswers.includes(key);
    const picked = check.selected.includes(key);
    if (picked) return isCorrectKey ? 'correct' : 'wrong';
    return isCorrectKey ? 'missed' : undefined;
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Sticky header keeps assignment name + progress visible on small screens */}
      <div className="sticky top-16 z-20 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{view.assignment?.title}</p>
            <p className="font-semibold">Question {index + 1} of {total}</p>
          </div>
          <button type="button" className="btn-secondary !min-h-[40px] !px-3" onClick={() => setExitOpen(true)}>
            <LogOut size={16} aria-hidden="true" /> <span className="hidden sm:inline">Exit</span><span className="sr-only sm:hidden">Exit test</span>
          </button>
        </div>
        <div role="progressbar" aria-label="Questions checked" aria-valuemin={0} aria-valuemax={total} aria-valuenow={checkedCount}
          className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full rounded-full bg-indigo-600 transition-all duration-300 dark:bg-indigo-400" style={{ width: `${(checkedCount / total) * 100}%` }} />
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{checkedCount} of {total} checked</p>
      </div>

      <fieldset key={question.questionId} className="mt-6 min-w-0">
        {multiple && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <ListChecks size={16} aria-hidden="true" /> Multiple Correct Answers
            </span>
            <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">Select all correct options.</p>
          </div>
        )}
        <legend className="mb-1 w-full whitespace-pre-line break-words text-lg font-semibold leading-snug sm:text-xl">{question.questionText}</legend>
        <div className="mt-4 space-y-3">
          {question.options.map((o) => (
            <OptionCard key={o.key} option={o} name={`q-${question.questionId}`} multiple={multiple}
              selected={selected.includes(o.key)} status={statusOf(o.key)} disabled={!!check} onChange={toggle} />
          ))}
        </div>
      </fieldset>

      {check && (
        <div role="status" aria-live="polite"
          className={`mt-6 rounded-2xl border-2 p-4 sm:p-5 ${check.isCorrect
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60' : 'border-rose-500 bg-rose-50 dark:bg-rose-950/60'}`}>
          <p className={`flex items-center gap-2 text-lg font-bold ${check.isCorrect ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}`}>
            {check.isCorrect ? <CheckCircle2 size={22} aria-hidden="true" /> : <XCircle size={22} aria-hidden="true" />}
            {check.isCorrect ? 'Correct!' : 'Incorrect'}
          </p>
          {!check.isCorrect && (
            <p className="mt-1 text-sm">{check.correctAnswers.length > 1 ? 'Correct answers' : 'Correct answer'}: <strong>{check.correctAnswers.join(', ')}</strong></p>
          )}
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Explanation</p>
          <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed">{check.explanation}</p>
        </div>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button type="button" className="btn-secondary" disabled={index === 0 || busy} onClick={() => setIndex((i) => i - 1)}>
          <ArrowLeft size={16} aria-hidden="true" /> Previous
        </button>
        {!check ? (
          <button type="button" className="btn-primary" disabled={selected.length === 0 || busy} onClick={checkAnswer}>
            {busy && <Loader2 className="animate-spin" size={16} aria-hidden="true" />} Check Answer
          </button>
        ) : isLast ? (
          <button type="button" className="btn-primary" disabled={busy || checkedCount < total} onClick={finish}>
            {busy ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <Flag size={16} aria-hidden="true" />} Finish Practice
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={() => setIndex((i) => i + 1)}>
            Next Question <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      {isLast && check && checkedCount < total && (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Go back and check the remaining questions to finish.</p>
      )}

      <ConfirmDialog open={exitOpen} title="Exit this test?" danger confirmLabel="Exit test" cancelLabel="Keep practicing"
        onCancel={() => setExitOpen(false)} onConfirm={() => navigate('/assignments')}>
        Your progress in this attempt won’t be scored. You can start a new attempt any time.
      </ConfirmDialog>
    </div>
  );
}
