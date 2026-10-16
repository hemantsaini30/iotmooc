import AssignmentGrid from '../components/AssignmentGrid.jsx';

export default function Assignments() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-bold sm:text-3xl">Assignments</h1>
      <p className="mb-6 text-slate-600 dark:text-slate-400">Pick an assignment to start practicing.</p>
      <AssignmentGrid />
    </>
  );
}
