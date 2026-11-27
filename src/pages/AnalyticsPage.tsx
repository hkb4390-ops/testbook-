import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Award, BarChart3, CheckCircle2, Clock, Target } from 'lucide-react';
import { statsService } from '../services/statsService';
import type { StatsResponse } from '../types/testbook';
import { EmptyState, ErrorBanner } from '../components/StateViews';
import { AnimatedNumber, IconBox, MotionCard, MotionSection } from '../components/MotionPrimitives';
import { formatDurationCompact, formatNumber } from '../utils/formatters';

export function AnalyticsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await statsService.getStats();
      setStats(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl glass-card" />
          ))}
        </div>
        <div className="h-72 rounded-3xl glass-card" />
      </div>
    );
  }

  if (error) {
    return <ErrorBanner message={error} onRetry={loadStats} />;
  }

  if (!stats?.summary) {
    return (
      <EmptyState
        title="No performance statistics yet"
        description="Submit at least one test to generate your accuracy trend and subject breakdown."
      />
    );
  }

  const s = stats.summary;
  const trendData = (stats.scoreTrend || []).map((pt, idx) => ({
    index: `#${idx + 1}`,
    title: pt.testTitle,
    percentage: Number(pt.percentage) || 0,
    accuracy: Number(pt.accuracy) || 0,
  }));

  const subjects = (stats.subjectStats || []).filter((sub) => sub.questions > 0);
  const difficulties = (stats.difficultyStats || []).filter((d) => d.questions > 0);

  return (
    <div className="space-y-8">
      <MotionSection>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <IconBox tone="cyan" size="lg">
              <BarChart3 className="w-5 h-5" />
            </IconBox>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Performance &amp; Statistics
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Cumulative metrics across {s.testsAttempted} attempted and {s.testsSubmitted}{' '}
                submitted tests.
              </p>
            </div>
          </div>
          <Link
            to="/history"
            className="text-xs font-bold text-indigo-600 dark:text-cyan-400 hover:underline"
          >
            View Attempt History
          </Link>
        </div>
      </MotionSection>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
        <MotionCard index={0}>
          <div className="rounded-2xl glass-card p-5 h-full">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Cumulative Score
              </span>
              <IconBox tone="cyan" size="sm">
                <Award className="w-4 h-4" />
              </IconBox>
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-2">
              <AnimatedNumber value={s.totalScore} decimals={s.totalScore % 1 ? 1 : 0} />{' '}
              <span className="text-base font-semibold text-slate-400">
                / {formatNumber(s.totalMarks)}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {formatNumber(s.overallPercentage, 2)}% overall
            </div>
          </div>
        </MotionCard>

        <MotionCard index={1}>
          <div className="rounded-2xl glass-card p-5 h-full">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Average Accuracy
              </span>
              <IconBox tone="emerald" size="sm">
                <Target className="w-4 h-4" />
              </IconBox>
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
              <AnimatedNumber value={s.averageAccuracy} decimals={1} suffix="%" />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Across {s.totalQuestions} questions
            </div>
          </div>
        </MotionCard>

        <MotionCard index={2}>
          <div className="rounded-2xl glass-card p-5 h-full">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Tests Submitted
              </span>
              <IconBox tone="indigo" size="sm">
                <CheckCircle2 className="w-4 h-4" />
              </IconBox>
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-2">
              <AnimatedNumber value={s.testsSubmitted} />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {s.testsAttempted} total started
            </div>
          </div>
        </MotionCard>

        <MotionCard index={3}>
          <div className="rounded-2xl glass-card p-5 h-full">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Time Invested
              </span>
              <IconBox tone="violet" size="sm">
                <Clock className="w-4 h-4" />
              </IconBox>
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-2">
              {formatDurationCompact(s.totalTimeSeconds)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active test duration
            </div>
          </div>
        </MotionCard>
      </div>

      {/* Score & Accuracy Trend */}
      {trendData.length >= 2 && (
        <MotionSection delay={0.08}>
          <section className="rounded-3xl glass-card p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Score &amp; Accuracy Trend Over Time
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.2} />
                  <XAxis dataKey="index" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                  <YAxis domain={[-20, 100]} tick={{ fontSize: 12, fill: '#94A3B8' }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    name="Accuracy %"
                    stroke="#06B6D4"
                    strokeWidth={2.5}
                    dot={{ r: 3.5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="percentage"
                    name="Score %"
                    stroke="#6366F1"
                    strokeWidth={2.5}
                    dot={{ r: 3.5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </MotionSection>
      )}

      {/* Subject Performance + Strengths / Weaknesses */}
      <MotionSection delay={0.12}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {subjects.length > 0 && (
            <section className="rounded-3xl glass-card p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Subject-Wise Performance
              </h2>
              <div className="space-y-3.5">
                {subjects.slice(0, 12).map((sub) => (
                  <div key={sub.subject} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white truncate">
                        {sub.subject}
                      </span>
                      <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {sub.correct}/{sub.attempted} ({formatNumber(sub.accuracy, 1)}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200/70 dark:bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full progress-gradient rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(0, Math.min(100, Number(sub.accuracy) || 0))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="space-y-6">
            {(stats.strongestSubjects?.length > 0 || stats.weakestSubjects?.length > 0) && (
              <section className="rounded-3xl glass-card p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Strongest &amp; Focus Areas
                </h2>
                {stats.strongestSubjects?.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                      Strongest Subjects
                    </div>
                    <div className="space-y-1.5 text-sm">
                      {stats.strongestSubjects.map((s) => (
                        <div
                          key={s.subject}
                          className="flex items-center justify-between text-slate-700 dark:text-slate-200"
                        >
                          <span>{s.subject}</span>
                          <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                            {formatNumber(s.accuracy, 1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {stats.weakestSubjects?.length > 0 && (
                  <div className="pt-3 border-t border-slate-200/70 dark:border-white/[0.08]">
                    <div className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-2">
                      Needs Practice
                    </div>
                    <div className="space-y-1.5 text-sm">
                      {stats.weakestSubjects.map((s) => (
                        <div
                          key={s.subject}
                          className="flex items-center justify-between text-slate-700 dark:text-slate-200"
                        >
                          <span>{s.subject}</span>
                          <span className="font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400">
                            {formatNumber(s.accuracy, 1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {difficulties.length > 0 && (
              <section className="rounded-3xl glass-card p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Difficulty Mastery
                </h2>
                <div className="space-y-3">
                  {difficulties.map((d) => (
                    <div key={d.difficulty} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900 dark:text-white capitalize">
                          {d.difficulty}
                        </span>
                        <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                          {d.correct}/{d.attempted} ({formatNumber(d.accuracy, 1)}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200/70 dark:bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full progress-gradient rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(0, Math.min(100, Number(d.accuracy) || 0))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </MotionSection>
    </div>
  );
}
