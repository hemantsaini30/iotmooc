import { Link } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';

export default function AssignmentCard({ assignment }) {
  const { assignmentId, number, title, description, available, totalQuestions } = assignment;
  return (
    <article className={`card flex flex-col p-5 transition duration-200 ${available ? 'hover:-translate-y-0.5 hover:shadow-md' : 'opacity-75'}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-base font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{number}</span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${available
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${available ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {available ? 'Available' : 'Coming Soon'}
        </span>
      </div>
      <h3 className="text-base font-semibold leading-snug">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">{totalQuestions} questions</p>
      {available ? (
        <Link to={`/assignments/${assignmentId}/start`} className="btn-primary mt-4" aria-label={`Start ${title}`}>
          Start Assignment <ArrowRight size={16} aria-hidden="true" />
        </Link>
      ) : (
        <button type="button" disabled className="btn-secondary mt-4" aria-label={`${title} is coming soon`}>
          <Lock size={16} aria-hidden="true" /> Coming Soon
        </button>
      )}
    </article>
  );
}
