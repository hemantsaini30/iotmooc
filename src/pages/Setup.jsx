import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ListOrdered, Loader2, Shuffle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api.js';
import { useAssignments } from '../hooks/useAssignments.js';
import { ErrorState, Loading } from '../components/States.jsx';

const MODES = [
  { value: 'ordered', title: 'Ordered Practice', icon: ListOrdered, text: 'Questions appear in their original sequence, starting from Question 1.' },
  { value: 'random', title: 'Random Practice', icon: Shuffle, text: 'Questions are shuffled for every new attempt. Each question appears exactly once.' },
];

export default function Setup() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { assignments, error, reload } = useAssignments();
  const [order, setOrder] = useState('ordered');
  const [starting, setStarting] = useState(false);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!assignments) return <Loading />;
  const assignment = assignments.find((a) => a.assignmentId === assignmentId);
  if (!assignment || !assignment.available) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-bold">Assignment unavailable</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">This assignment doesn’t exist or is still coming soon.</p>
        <Link to="/assignments" className="btn-primary mt-6">Back to Assignments</Link>
      </div>
    );
  }

  async function start() {
    setStarting(true);
    try {
      const attempt = await api.createAttempt(assignmentId, order);
      navigate(`/attempt/${attempt.attemptId}`);
    } catch (e) {
      toast.error(e.message);
      setStarting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Assignment {assignment.number}</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{assignment.title}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">{assignment.totalQuestions} questions · check each answer to see the explanation.</p>
      <fieldset className="mt-8">
        <legend className="mb-3 font-semibold">Choose the question order</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {MODES.map(({ value, title, icon: Icon, text }) => (
            <label key={value} className={`card flex cursor-pointer flex-col gap-2 border-2 p-4 transition-colors focus-within:ring-2 focus-within:ring-indigo-500 ${order === value ? 'border-indigo-600 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/60' : 'hover:border-indigo-300 dark:hover:border-indigo-500'}`}>
              <input type="radio" name="order" value={value} checked={order === value} onChange={() => setOrder(value)} className="sr-only" />
              <span className="flex items-center gap-2 font-semibold"><Icon size={18} aria-hidden="true" /> {title}
                {order === value && <span className="ml-auto text-xs font-semibold text-indigo-700 dark:text-indigo-300">Selected</span>}</span>
              <span className="text-sm text-slate-600 dark:text-slate-400">{text}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link to="/assignments" className="btn-secondary">Cancel</Link>
        <button type="button" className="btn-primary" onClick={start} disabled={starting}>
          {starting && <Loader2 className="animate-spin" size={16} aria-hidden="true" />} Start Test
        </button>
      </div>
    </div>
  );
}
