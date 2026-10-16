import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, Radio, X } from 'lucide-react';
import ThemeToggle from './ThemeToggle.jsx';

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
             : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`;

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight" onClick={() => setOpen(false)}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white"><Radio size={18} aria-hidden="true" /></span>
          <span>IOT<span className="text-indigo-600 dark:text-indigo-400">MOOC</span></span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
          <NavLink to="/" end className={linkClass}>Home</NavLink>
          <NavLink to="/assignments" className={linkClass}>Assignments</NavLink>
          <NavLink to="/tests" className={linkClass}>Tests</NavLink>
          <ThemeToggle />
        </nav>
        <div className="flex items-center gap-1 sm:hidden">
          <ThemeToggle />
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
            {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="flex flex-col gap-1 border-t border-slate-200 px-4 py-3 dark:border-slate-800 sm:hidden">
          <NavLink to="/" end className={linkClass} onClick={() => setOpen(false)}>Home</NavLink>
          <NavLink to="/assignments" className={linkClass} onClick={() => setOpen(false)}>Assignments</NavLink>
          <NavLink to="/tests" className={linkClass} onClick={() => setOpen(false)}>Tests</NavLink>
        </nav>
      )}
    </header>
  );
}