import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, History, Moon, Settings, Sun, UserCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { LANGUAGE_LABELS } from '../config/apiConfig';
import { statsService } from '../services/statsService';
import type { StatsResponse } from '../types/testbook';
import { AnimatedNumber, IconBox, MotionSection } from '../components/MotionPrimitives';
import { formatDurationCompact } from '../utils/formatters';

export function ProfilePage() {
  const { theme, setTheme } = useTheme();
  const {
    defaultLanguage,
    setDefaultLanguage,
    autosaveEnabled,
    setAutosaveEnabled,
  } = usePreferences();

  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    statsService.getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <MotionSection>
        <div className="flex items-start gap-3.5">
          <IconBox tone="indigo" size="lg">
            <Settings className="w-5 h-5" />
          </IconBox>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Profile &amp; Preferences
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Manage your exam language, display theme, and review test preparation statistics.
            </p>
          </div>
        </div>
      </MotionSection>

      {/* Backend Session Capability Notice */}
      <MotionSection delay={0.04}>
        <section className="rounded-3xl glass-card p-6 flex items-start gap-4">
          <IconBox tone="cyan" size="md">
            <UserCheck className="w-5 h-5" />
          </IconBox>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Public Study Workspace
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              The connected Testbook API operates without a separate user login endpoint. Your test attempts, history, and analytics sync directly with the configured backend, while your interface preferences below are saved locally in your browser.
            </p>
          </div>
        </section>
      </MotionSection>

      {/* Saved Preferences */}
      <MotionSection delay={0.08}>
        <section className="rounded-3xl glass-card p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Saved Preferences
          </h2>

          {/* Theme Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/70 dark:border-white/[0.08]">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Appearance Theme
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Switch between crisp daylight mode and deep cosmic dark mode.
              </div>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100/90 dark:bg-[#0B0F19]/80 border border-slate-200/70 dark:border-white/10 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
                  theme === 'light'
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Sun className="w-3.5 h-3.5" /> Light
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Moon className="w-3.5 h-3.5" /> Dark
              </button>
            </div>
          </div>

          {/* Default Language */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/70 dark:border-white/[0.08]">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Preferred Exam Language
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Pre-selected on test instructions and solutions when supported by the paper.
              </div>
            </div>
            <select
              value={defaultLanguage}
              onChange={(e) => setDefaultLanguage(e.target.value)}
              aria-label="Preferred exam language"
              className="h-10 px-3 rounded-xl border border-slate-300/80 dark:border-white/15 bg-white/80 dark:bg-[#0B0F19]/80 text-sm text-slate-900 dark:text-slate-100"
            >
              {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Autosave toggle */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Periodic Exam Autosave
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Automatically saves your responses every 15 seconds during active tests.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autosaveEnabled}
              onClick={() => setAutosaveEnabled(!autosaveEnabled)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                autosaveEnabled
                  ? 'btn-gradient'
                  : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
              }`}
            >
              {autosaveEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </section>
      </MotionSection>

      {/* Statistics Snapshot */}
      {stats?.summary && (
        <MotionSection delay={0.12}>
          <section className="rounded-3xl glass-card p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Preparation Summary
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Submitted</div>
                <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                  <AnimatedNumber value={stats.summary.testsSubmitted} />
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Avg Accuracy</div>
                <div className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                  <AnimatedNumber value={stats.summary.averageAccuracy} decimals={1} suffix="%" />
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Questions Solved</div>
                <div className="text-lg font-extrabold font-mono text-indigo-600 dark:text-cyan-400">
                  <AnimatedNumber value={stats.summary.totalQuestions} />
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Time Invested</div>
                <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                  {formatDurationCompact(stats.summary.totalTimeSeconds)}
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-200/70 dark:border-white/[0.08] flex flex-wrap gap-3">
              <Link
                to="/history"
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/15 bg-white/70 dark:bg-white/[0.04] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-400 inline-flex items-center gap-1.5 transition-colors"
              >
                <History className="w-3.5 h-3.5" /> View Test History
              </Link>
              <Link
                to="/analytics"
                className="px-4 py-2 rounded-xl btn-gradient text-xs font-bold inline-flex items-center gap-1.5"
              >
                <BarChart3 className="w-3.5 h-3.5" /> Full Analytics
              </Link>
            </div>
          </section>
        </MotionSection>
      )}
    </div>
  );
}
