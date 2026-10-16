import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api.js';
import { ErrorState, Loading } from '../components/States.jsx';

// Presentation only. Which lengths exist and whether they are available comes from the API.
const COPY = {
  30: { name: 'Quick Practice', text: 'A short mixed set to warm up or revise in a few minutes.' },
  60: { name: 'Standard Test', text: 'A balanced test with questions from across all assignments.' },
  90: { name: 'Extended Test', text: 'A longer test for deeper revision across every topic.' },
  120: { name: 'Complete Question Bank', text: 'Every question in the bank, in a fresh random order.' },
};

export default function Tests() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [startingLength, setStartingLength] = useState(null);

  const load = useCallback(() => {
    setError(null);
    setData(null);
    api.getTests().then(setData).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function start(length) {
    setStartingLength(length);
    try {
      const t = await api.createTest(length);
      navigate(`/tests/${t.attemptId}`);
    } catch (e) {
      toast.error(e.message);
      setStartingLength(null);
    }
  }

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold sm:text-3xl">Tests</h1>
      <p className="mb-6 max-w-2xl text-slate-600 dark:text-slate-400">
        Random tests drawn from all available assignments. You can skip questions and change answers freely;
        answers and explanations are shown after you submit.
      </p>
      {error && <ErrorState message={error} onRetry={load} />}
      {!error && !data && <Loading label="Loading tests…" />}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.tests.map(({ length, enabled, message }) => {
            const copy = COPY[length] || { name: `${length}-Question Test`, text: 'A random test from the question bank.' };
            const busy = startingLength === length;
            return (
              <article key={length} className={`card flex flex-col p-5 transition duration-200 ${enabled ? 'hover:-translate-y-0.5 hover:shadow-md' : 'opacity-75'}`}>
                <p className="text-4xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">{length}
                  <span className="ml-2 text-base font-semibold text-slate-700 dark:text-slate-300">Questions</span></p>
                <h2 className="mt-2 text-base font-semibold">{copy.name}</h2>
                <p className="mt-1 flex-1 text-sm text-slate-600 dark:text-slate-400">{copy.text}</p>
                {!enabled && <p className="mt-3 text-sm font-medium text-amber-800 dark:text-amber-300">{message}</p>}
                <button type="button" className="btn-primary mt-4" disabled={!enabled || startingLength !== null}
                  onClick={() => start(length)} aria-label={`Start ${length} question test`}>
                  {busy ? <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                    : enabled ? <ArrowRight size={16} aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
                  {enabled ? 'Start Test' : 'Unavailable'}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}