import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eraser, Grid3x3, ListChecks, Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api.js';
import OptionCard from '../components/OptionCard.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { ErrorState, Loading } from '../components/States.jsx';
import { toggleSelection } from '../../lib/scoring.js';

const storageKey = (id) => `iotmooc-test-${id}`;

// Selections live in React state and are mirrored to sessionStorage so a page refresh keeps them.
// Nothing is graded here: the server grades everything when the test is submitted.
function loadSaved(id) {
  try { return JSON.parse(sessionStorage.getItem(storageKey(id))) || {}; } catch { return {}; }
}

export default function TakeTest() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [view, setView] = useState(null);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(() => loadSaved(attemptId)); // questionId -> selected keys
  const [panelOpen, setPanelOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setError(null);
    setView(null);
    api.getTest(attemptId).then((v) => {
      if (v.submittedAt) navigate(`/tests/${attemptId}/results`, { replace: true });
      else setView(v);
    }).catch((e) => setError(e.message));
  }, [attemptId, navigate]);
  useEffect(load, [load]);

  useEffect(() => {
    try { sessionStorage.setItem(storageKey(attemptId), JSON.stringify(answers)); } catch { /* storage unavailable */ }
  }, [answers, attemptId]);

  const answeredCount = useMemo(
    () => (view ? view.questions.filter((q) => (answers[q.questionId] || []).length > 0).length : 0),
    [view, answers]
  );

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!view) return <Loading label="Preparing your test…" />;

  const total = view.total;
  const question = view.questions[index];
  const multiple = question.type === 'multiple';
  const selected = answers[question.questionId] || [];

  const toggle = (key) => setAnswers((a) => ({ ...a, [question.questionId]: toggleSelection(a[question.questionId] || [], key, multiple) }));
  const clear = () => setAnswers((a) => ({ ...a, [question.questionId]: [] }));
  const goTo = (i) => { setIndex(i); setPanelOpen(false); };

  async function submit() {
    setSubmitting(true);
    try {
      const payload = Object.fromEntries(Object.entries(answers).filter(([id, sel]) => sel.length > 0 && view.questions.some((q) => q.questionId === id)));
      await api.submitTest(attemptId, payload);
      try { sessionStorage.removeItem(storageKey(attemptId)); } catch { /* ignore */ }
      navigate(`/tests/${attemptId}/results`);
    } catch (e) {
      toast.error(e.message);
      setSubmitting(false);
      setConfirmOpen(false);
    }
  }

  const panel = (
    <nav aria-label="Question navigator" className="card p-4">
      <p className="mb-1 text-sm font-semibold">Questions</p>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Filled = answered, outlined = not answered.</p>
      <ol className="grid grid-cols-6 gap-2 sm:grid-cols-10 lg:grid-cols-4">
        {view.questions.map((q, i) => {
          const done = (answers[q.questionId] || []).length > 0;
          const current = i === index;
          return (
            <li key={q.questionId}>
              <button type="button" onClick={() => goTo(i)} aria-current={current ? 'step' : undefined}
                aria-label={`Question ${i + 1}, ${done ? 'answered' : 'not answered'}${current ? ', current' : ''}`}
                className={`flex h-10 w-full items-center justify-center rounded-lg border-2 text-sm font-semibold transition-colors ${
                  done ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
                       : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
                } ${current ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : ''}`}>
                {i + 1}
              </button>
            </li>
          );
        })}
      </ol>
      <button type="button" className="btn-primary mt-4 w-full" onClick={() => setConfirmOpen(true)}>
        <Send size={16} aria-hidden="true" /> Submit Test
      </button>
    </nav>
  );

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{total}-question test</p>
            <p className="font-semibold">Question {index + 1} of {total}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary !min-h-[40px] !px-3 lg:hidden" aria-expanded={panelOpen}
              aria-controls="question-panel" onClick={() => setPanelOpen((o) => !o)}>
              <Grid3x3 size={16} aria-hidden="true" /> Questions
            </button>
            <button type="button" className="btn-primary !min-h-[40px] !px-3" onClick={() => setConfirmOpen(true)}>
              <Send size={16} aria-hidden="true" /> Submit
            </button>
          </div>
        </div>
        <div role="progressbar" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answeredCount}
          className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full rounded-full bg-indigo-600 transition-all duration-300 dark:bg-indigo-400" style={{ width: `${(answeredCount / total) * 100}%` }} />
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{answeredCount} of {total} answered</p>
      </div>

      {panelOpen && <div id="question-panel" className="mt-4 lg:hidden">{panel}</div>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <section aria-label="Question" className="min-w-0">
          <fieldset key={question.questionId} className="min-w-0">
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
                <OptionCard key={o.key} option={o} name={`t-${question.questionId}`} multiple={multiple}
                  selected={selected.includes(o.key)} disabled={false} onChange={toggle} />
              ))}
            </div>
          </fieldset>

          <div className="mt-4 min-h-[2.5rem]">
            {selected.length > 0 && (
              <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 underline-offset-2 hover:underline dark:text-slate-300">
                <Eraser size={15} aria-hidden="true" /> Clear answer
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button type="button" className="btn-secondary" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
              <ArrowLeft size={16} aria-hidden="true" /> Previous
            </button>
            {index < total - 1 ? (
              <button type="button" className="btn-primary" onClick={() => setIndex((i) => i + 1)}>
                {selected.length === 0 ? 'Skip' : 'Next'} <ArrowRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={() => setConfirmOpen(true)}>
                <Send size={16} aria-hidden="true" /> Submit Test
              </button>
            )}
          </div>
        </section>

        <aside className="hidden lg:block">
          <div className="sticky top-48">{panel}</div>
        </aside>
      </div>

      <ConfirmDialog open={confirmOpen} title="Submit this test?" confirmLabel={submitting ? 'Submitting…' : 'Submit test'}
        cancelLabel="Return to test" onCancel={() => !submitting && setConfirmOpen(false)} onConfirm={() => !submitting && submit()}>
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><dt className="text-xs">Total</dt><dd className="text-xl font-bold">{total}</dd></div>
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><dt className="text-xs">Answered</dt><dd className="text-xl font-bold">{answeredCount}</dd></div>
          <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><dt className="text-xs">Unanswered</dt><dd className="text-xl font-bold">{total - answeredCount}</dd></div>
        </dl>
        <p className="mt-3">You can’t change your answers after submitting. Unanswered questions count as skipped.</p>
      </ConfirmDialog>
    </div>
  );
}