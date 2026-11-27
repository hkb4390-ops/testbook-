import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
} from 'recharts';
import {
  ArrowLeft,
  Award,
  BookOpenCheck,
  Check,
  RotateCcw,
  Share2,
} from 'lucide-react';
import { resultsService } from '../services/resultsService';
import { getLanguageLabel } from '../config/apiConfig';
import type { AttemptResultResponse } from '../types/testbook';
import { ErrorBanner } from '../components/StateViews';
import { AnimatedNumber, IconBox, MotionSection } from '../components/MotionPrimitives';
import { formatDurationCompact, formatNumber } from '../utils/formatters';

export function ResultPage() {
  const { attemptId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const initialState = (location.state as { resultData?: AttemptResultResponse } | null)
    ?.resultData;

  const [data, setData] = useState<AttemptResultResponse | null>(initialState || null);
  const [loading, setLoading] = useState(!initialState);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAllTopics, setShowAllTopics] = useState(false);

  const loadResult = async () => {
    if (!attemptId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await resultsService.getAttemptResult(attemptId);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test result.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialState) {
      loadResult();
    }
  }, [attemptId]);

  const totals = data?.totals;

  const donutData = useMemo(() => {
    if (!totals) return [];
    return [
      { name: 'Correct', value: Number(totals.correctCount) || 0, color: '#10B981' },
      { name: 'Incorrect', value: Number(totals.incorrectCount) || 0, color: '#F43F5E' },
      { name: 'Partial', value: Number(totals.partialCount) || 0, color: '#F59E0B' },
      { name: 'Unscored', value: Number(totals.unscoredCount) || 0, color: '#6366F1' },
      { name: 'Skipped', value: Number(totals.skippedCount) || 0, color: '#64748B' },
    ].filter((s) => s.value > 0);
  }, [totals]);

  const handleShare = async () => {
    if (!totals) return;
    const summary = `${data?.attempt?.testTitle || 'Mock Test'} — Score: ${formatNumber(
      totals.score
    )}/${formatNumber(totals.totalMarks)} | Accuracy: ${formatNumber(
      totals.accuracy,
      1
    )}% | ${window.location.href}`;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked in restricted frame
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 rounded-3xl glass-card" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl glass-card" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data || !totals) {
    return (
      <div className="space-y-4">
        <Link
          to="/tests"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-400"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Tests
        </Link>
        <ErrorBanner
          title="Result Unavailable"
          message={error || 'Could not retrieve attempt result.'}
          onRetry={loadResult}
        />
      </div>
    );
  }

  const sections = data.sectionAnalysis || [];
  const subjects = (data.subjectAnalysis || []).filter((s) => s.total > 0);
  const difficulties = (data.difficultyAnalysis || []).filter((d) => d.total > 0);
  const topics = (data.topicAnalysis || [])
    .filter((t) => t.total > 0)
    .slice()
    .sort((a, b) => Number(a.accuracy) - Number(b.accuracy));
  const cohort = data.cohortComparison;
  const behaviour = data.behaviour;
  const unscoredCount = Number(totals.unscoredCount) || 0;
  const hasCohortData =
    cohort &&
    ((cohort.betterThanCohort || 0) +
      (cohort.worseThanCohort || 0) +
      (cohort.fasterThanAverage || 0) +
      (cohort.slowerThanAverage || 0) >
      0);

  const testId = data.attempt?.testId;
  const seriesSlug = data.attempt?.seriesSlug;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/tests"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Tests
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleShare}
            className="h-9 px-3.5 rounded-xl glass-card text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 hover:border-indigo-400 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Share Result'}
          </button>

          {testId && seriesSlug && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/exam/${encodeURIComponent(testId)}/instructions?slug=${encodeURIComponent(
                    seriesSlug
                  )}`
                )
              }
              className="h-9 px-3.5 rounded-xl glass-card text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 hover:border-indigo-400 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry Test
            </button>
          )}

          <Link
            to={`/solutions/${encodeURIComponent(attemptId)}`}
            className="h-9 px-4 rounded-xl btn-gradient text-xs font-bold inline-flex items-center gap-1.5"
          >
            <BookOpenCheck className="w-3.5 h-3.5" />
            View Solutions
          </Link>
        </div>
      </div>

      {/* Scorecard Hero */}
      <MotionSection>
        <section className="relative overflow-hidden rounded-3xl glass-card p-6 sm:p-8">
          <div
            className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-500/20 via-violet-500/15 to-cyan-500/20 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <IconBox tone="indigo" size="lg">
                <Award className="w-6 h-6" />
              </IconBox>
              <div>
                <div className="text-xs font-semibold text-indigo-600 dark:text-cyan-400">
                  {data.attempt?.seriesName || data.attempt?.seriesSlug || 'Performance Scorecard'}
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {data.attempt?.testTitle || 'Test Result'}
                </h1>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2.5 gap-y-1 tabular-nums">
                  <span>Time Taken: {formatDurationCompact(totals.timeSpentSeconds)}</span>
                  {typeof totals.estimatedPercentile === 'number' && totals.estimatedPercentile > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-bold text-indigo-600 dark:text-cyan-400">
                        Est. Percentile: {formatNumber(totals.estimatedPercentile, 2)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="text-left md:text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400">Score Achieved</div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500 dark:from-indigo-300 dark:via-violet-300 dark:to-cyan-300 bg-clip-text text-transparent mt-0.5">
                <AnimatedNumber value={totals.score} decimals={totals.score % 1 ? 1 : 0} />{' '}
                <span className="text-xl font-bold text-slate-400">
                  / {formatNumber(totals.totalMarks)}
                </span>
              </div>
            </div>
          </div>

          {/* Core KPI Grid */}
          <div className="relative mt-6 pt-6 border-t border-slate-200/70 dark:border-white/[0.08] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 tabular-nums">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Accuracy</div>
              <div className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                <AnimatedNumber value={totals.accuracy} decimals={1} suffix="%" />
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Percentage</div>
              <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
                <AnimatedNumber value={totals.percentage} decimals={1} suffix="%" />
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Correct</div>
              <div className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                <AnimatedNumber value={totals.correctCount} />
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Incorrect</div>
              <div className="text-lg font-extrabold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                <AnimatedNumber value={totals.incorrectCount} />
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Unattempted</div>
              <div className="text-lg font-extrabold font-mono text-slate-600 dark:text-slate-300 mt-0.5">
                <AnimatedNumber value={totals.skippedCount} />
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Attempted</div>
              <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
                {totals.attemptedCount} / {totals.totalQuestions}
              </div>
            </div>
          </div>
        </section>
      </MotionSection>

      {/* Unscored Notice if applicable */}
      {(unscoredCount > 0 || data.graded === false) && (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-50/85 dark:bg-amber-950/30 backdrop-blur-md p-4 text-sm text-amber-800 dark:text-amber-300">
          <div className="font-bold">Answer key pending for some questions</div>
          <p className="text-xs mt-1">
            {unscoredCount > 0
              ? `${unscoredCount} of ${totals.totalQuestions} questions do not yet have an upstream answer key and are excluded from accuracy.`
              : 'Official answer keys have not unlocked upstream yet for this paper.'}
          </p>
        </div>
      )}

      {/* Charts Row: Question Breakdown Donut + Section Performance */}
      <MotionSection delay={0.06}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl glass-card p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Question Breakdown ({totals.totalQuestions} Qs)
            </h2>
            {donutData.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-44 h-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={3}
                      >
                        {donutData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 w-full space-y-2.5 text-sm">
                  {donutData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No breakdown data available.</p>
            )}
          </div>

          {/* Section-wise Performance */}
          {sections.length > 0 && (
            <div className="rounded-2xl glass-card p-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                Section-Wise Performance
              </h2>
              <div className="space-y-4">
                {sections.map((sec) => {
                  const total = Math.max(1, Number(sec.total) || 0);
                  return (
                    <div key={sec.key} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          {sec.label || sec.key}
                        </span>
                        <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatNumber(sec.score)} / {formatNumber(sec.maxScore)} ·{' '}
                          {formatNumber(sec.accuracy, 1)}% acc
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-200/70 dark:bg-white/[0.06] overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full"
                          style={{ width: `${((sec.correct || 0) / total) * 100}%` }}
                        />
                        <div
                          className="bg-amber-500 h-full"
                          style={{ width: `${((sec.partial || 0) / total) * 100}%` }}
                        />
                        <div
                          className="bg-rose-500 h-full"
                          style={{ width: `${((sec.incorrect || 0) / total) * 100}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        {sec.correct} correct · {sec.incorrect} wrong · {sec.skipped} skipped ·{' '}
                        {formatDurationCompact(sec.timeSpent)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </MotionSection>

      {/* Subject Accuracy Radar + Difficulty Bar Chart */}
      {(subjects.length >= 3 || difficulties.length > 0) && (
        <MotionSection delay={0.1}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {subjects.length >= 3 && (
              <div className="rounded-2xl glass-card p-6">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                  Subject Accuracy Radar
                </h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      data={subjects.slice(0, 8).map((s) => ({
                        subject: (s.label || s.key).slice(0, 14),
                        accuracy: Number(s.accuracy) || 0,
                      }))}
                    >
                      <PolarGrid stroke="#64748b" strokeOpacity={0.3} />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                      <Radar
                        name="Accuracy %"
                        dataKey="accuracy"
                        stroke="#6366F1"
                        fill="#06B6D4"
                        fillOpacity={0.28}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {difficulties.length > 0 && (
              <div className="rounded-2xl glass-card p-6">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                  Difficulty-Wise Accuracy
                </h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={difficulties.map((d) => ({
                        name: d.label || d.key,
                        accuracy: Number(d.accuracy) || 0,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.2} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#94A3B8' }} />
                      <Tooltip />
                      <Bar dataKey="accuracy" name="Accuracy %" fill="#6366F1" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </MotionSection>
      )}

      {/* Cohort & Behaviour Insights */}
      {(hasCohortData ||
        (behaviour &&
          ((behaviour.answerChanges || 0) +
            (behaviour.bookmarked || 0) +
            (behaviour.revisitedQuestions || 0) >
            0))) && (
        <MotionSection delay={0.12}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {hasCohortData && cohort && (
              <div className="rounded-2xl glass-card p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  You vs Cohort
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm tabular-nums">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Beat Cohort On</div>
                    <div className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                      <AnimatedNumber value={cohort.betterThanCohort || 0} /> Qs
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Faster Than Avg</div>
                    <div className="text-lg font-extrabold font-mono text-indigo-600 dark:text-cyan-400">
                      <AnimatedNumber value={cohort.fasterThanAverage || 0} /> Qs
                    </div>
                  </div>
                </div>
                {typeof cohort.averageCohortAccuracy === 'number' && (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Average cohort accuracy on attempted questions:{' '}
                    <strong className="text-slate-900 dark:text-white">
                      {formatNumber(cohort.averageCohortAccuracy, 1)}%
                    </strong>
                  </div>
                )}
              </div>
            )}

            {behaviour && (
              <div className="rounded-2xl glass-card p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Attempt Behaviour
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Answer Changes</div>
                    <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                      {behaviour.answerChanges || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Bookmarked</div>
                    <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                      {behaviour.bookmarked || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Revisited</div>
                    <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                      {behaviour.revisitedQuestions || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Avg / Question</div>
                    <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                      {formatNumber(behaviour.averageTimePerQuestion, 0)}s
                    </div>
                  </div>
                </div>
                {behaviour.languagesUsed && behaviour.languagesUsed.length > 0 && (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Languages used:{' '}
                    {behaviour.languagesUsed.map((l) => getLanguageLabel(l)).join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        </MotionSection>
      )}

      {/* Topic Strength Matrix */}
      {topics.length > 0 && (
        <MotionSection delay={0.14}>
          <section className="rounded-2xl glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Topic Strength Matrix
              </h2>
              {topics.length > 8 && (
                <button
                  type="button"
                  onClick={() => setShowAllTopics((p) => !p)}
                  className="text-xs font-bold text-indigo-600 dark:text-cyan-400 hover:underline"
                >
                  {showAllTopics ? 'Show less' : `Show all ${topics.length}`}
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3 font-semibold">Topic</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Correct / Total</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Score</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.06]">
                  {(showAllTopics ? topics : topics.slice(0, 8)).map((topic) => (
                    <tr key={topic.key} className="hover:bg-indigo-50/35 dark:hover:bg-white/[0.03] transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {topic.label || topic.key}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {topic.correct} / {topic.total}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                        {formatNumber(topic.score)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-indigo-600 dark:text-cyan-400">
                        {formatNumber(topic.accuracy, 1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </MotionSection>
      )}
    </div>
  );
}
