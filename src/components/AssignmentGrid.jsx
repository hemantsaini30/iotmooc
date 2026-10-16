import { useAssignments } from '../hooks/useAssignments.js';
import AssignmentCard from './AssignmentCard.jsx';
import { ErrorState, Loading } from './States.jsx';

export default function AssignmentGrid() {
  const { assignments, error, reload } = useAssignments();
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!assignments) return <Loading label="Loading assignments…" />;
  if (assignments.length === 0) {
    return <p className="card p-6 text-center text-slate-600 dark:text-slate-400">No assignments found. Run <code>npm run import</code> to load the question bank.</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {assignments.map((a) => <AssignmentCard key={a.assignmentId} assignment={a} />)}
    </div>
  );
}
