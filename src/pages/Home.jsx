import { ArrowDown } from 'lucide-react';
import AssignmentGrid from '../components/AssignmentGrid.jsx';

export default function Home() {
  return (
    <>
      <section className="py-6 text-center sm:py-12">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Practice. Improve. <span className="text-indigo-600 dark:text-indigo-400">Master.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-600 dark:text-slate-400 sm:text-lg">
          Practice IOTMOOC assignments question by question, get instant feedback and read the explanation for every answer.
        </p>
        <a href="#assignments" className="btn-primary mt-7">Start Practicing <ArrowDown size={16} aria-hidden="true" /></a>
      </section>
      <section id="assignments" aria-labelledby="assignments-heading" className="scroll-mt-24 pt-6">
        <h2 id="assignments-heading" className="mb-4 text-xl font-bold">Assignments</h2>
        <AssignmentGrid />
      </section>
    </>
  );
}
