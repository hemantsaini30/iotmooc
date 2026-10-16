import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">The page you are looking for does not exist.</p>
      <Link to="/assignments" className="btn-primary mt-6">Back to Assignments</Link>
    </div>
  );
}
