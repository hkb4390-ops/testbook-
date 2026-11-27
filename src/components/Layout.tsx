import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BookCopy,
  ClipboardList,
  GraduationCap,
  History,
  Home,
  User,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/series', label: 'Test Series', icon: BookCopy, end: false },
  { to: '/tests', label: 'Tests', icon: ClipboardList, end: false },
  { to: '/history', label: 'History', icon: History, end: false },
  { to: '/profile', label: 'Profile', icon: User, end: false },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Distraction-free exam screen hides site navigation chrome
  const isExamTaker = location.pathname.startsWith('/exam/');
  if (isExamTaker) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col app-ambient-bg text-slate-900 dark:text-slate-100">
      {/* Desktop & Mobile Top Navigation — strict 3-zone contract */}
      <header className="sticky top-0 z-30 h-14 bg-white/85 dark:bg-[#0B0F19]/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <NavLink
            to="/"
            className="inline-flex items-center gap-2.5 text-lg font-extrabold tracking-tight whitespace-nowrap shrink-0 group"
          >
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-500 flex items-center justify-center text-white shadow-[0_6px_16px_-4px_rgba(99,102,241,0.5)] group-hover:scale-105 transition-transform">
              <GraduationCap className="w-4 h-4" />
            </span>
            <span className="bg-gradient-to-r from-slate-900 via-indigo-700 to-cyan-600 dark:from-white dark:via-indigo-300 dark:to-cyan-300 bg-clip-text text-transparent">
              TestBook Prep
            </span>
          </NavLink>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive
                    ? 'text-indigo-600 dark:text-cyan-400 border-indigo-600 dark:border-cyan-400 font-semibold'
                    : 'border-transparent hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/series"
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive
                    ? 'text-indigo-600 dark:text-cyan-400 border-indigo-600 dark:border-cyan-400 font-semibold'
                    : 'border-transparent hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              Test Series
            </NavLink>
            <NavLink
              to="/tests"
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive
                    ? 'text-indigo-600 dark:text-cyan-400 border-indigo-600 dark:border-cyan-400 font-semibold'
                    : 'border-transparent hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              Tests
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive
                    ? 'text-indigo-600 dark:text-cyan-400 border-indigo-600 dark:border-cyan-400 font-semibold'
                    : 'border-transparent hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              History
            </NavLink>
            <NavLink
              to="/analytics"
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive
                    ? 'text-indigo-600 dark:text-cyan-400 border-indigo-600 dark:border-cyan-400 font-semibold'
                    : 'border-transparent hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              Analytics
            </NavLink>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="px-4 py-2 rounded-xl text-xs font-bold btn-gradient inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <User className="w-3.5 h-3.5" />
              Profile
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-10">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/[0.08] grid grid-cols-5 items-center"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
                  isActive
                    ? 'text-indigo-600 dark:text-cyan-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 leading-none whitespace-nowrap">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
