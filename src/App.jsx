import { Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Header from './components/Header.jsx';
import Home from './pages/Home.jsx';
import Assignments from './pages/Assignments.jsx';
import Setup from './pages/Setup.jsx';
import Practice from './pages/Practice.jsx';
import Results from './pages/Results.jsx';
import Tests from './pages/Tests.jsx';
import TakeTest from './pages/TakeTest.jsx';
import TestResults from './pages/TestResults.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
  window.scrollTo(0, 0);
}, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <Header />
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/assignments/:assignmentId/start" element={<Setup />} />
          <Route path="/attempt/:attemptId" element={<Practice />} />
          <Route path="/attempt/:attemptId/results" element={<Results />} />
          <Route path="/tests" element={<Tests />} />
          <Route path="/tests/:attemptId" element={<TakeTest />} />
          <Route path="/tests/:attemptId/results" element={<TestResults />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        IOTMOOC – practice, improve, master.
      </footer>
    </div>
  );
}