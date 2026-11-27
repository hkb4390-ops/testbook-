import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpenCheck, Eye, History, RotateCcw } from 'lucide-react';
import { historyService } from '../services/historyService';
import type { HistoryAttemptItem, V1AttemptItem } from '../types/testbook';
import { EmptyState, ErrorBanner, LoadingGrid } from '../components/StateViews';
import { IconBox, MotionCard, MotionSection } from '../components/MotionPrimitives';
import {
  formatDateTime,
  formatDurationCompact,
  formatNumber,
} from '../utils/formatters';

export function HistoryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';

  const [v2Attempts, setV2Attempts] = useState<HistoryAttemptItem[]>([]);
  const [v1Attempts, setV1Attempts] = useState<V1AttemptItem[]>([]);
  const [filter, setFilter] = useState<string>(initialStatus);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await historyService.getCombinedHistory();
      setV2Attempts(res.v2Attempts);
      setV1Attempts(res.v1Attempts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filteredV2 = useMemo(() => {
    if (filter === 'all') return v2Attempts;
    return v2Attempts.filter((a) => a.status === filter);
  }, [v2Attempts, filter]);

  const changeFilter = (next: string) => {
    setFilter(next);
    if (next === 'all') setSearchParams({});
    else setSearchParams({ status: next });
  };

  return (
    <div className="space-y-6">
      <MotionSection>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <IconBox tone="violet" size="lg">
              <History className="w-5 h-5" />
            </IconBox>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Attempt History
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Review past test scorecards, inspect solutions, or resume in-progress attempts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 glass-card rounded-xl w-fit">
            {[
              ['all', `All (${v2Attempts.length})`],
              ['submitted', `Submitted (${v2Attempts.filter((a) => a.status === 'submitted').length})`],
              ['in_progress', `In Progress (${v2Attempts.filter((a) => a.status === 'in_progress').length})`],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => changeFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  filter === key
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </MotionSection>

      {error && <ErrorBanner message={error} onRetry={loadHistory} />}

      {loading ? (
        <LoadingGrid count={6} columns={2} />
      ) : filteredV2.length === 0 && v1Attempts.length === 0 ? (
        <EmptyState
          title="No attempts found"
          description="Take a mock test from Test Series or Free Tests to see your history and scorecards here."
          actionLabel="Browse Tests"
          onAction={() => navigate('/tests')}
        />
      ) : (
        <div className="space-y-8">
          {filteredV2.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredV2.map((a, idx) => {
                const isSubmitted = a.status === 'submitted';
                return (
                  <MotionCard key={a.attemptId} index={idx}>
                    <div className="h-full rounded-2xl glass-card-interactive p-5 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-500 dark:text-slate-400 truncate">
                            {a.seriesName || a.seriesSlug || 'Testbook'}
                          </span>
                          <span
                            className={`font-bold shrink-0 ${
                              isSubmitted
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {isSubmitted ? 'Submitted' : 'In Progress'}
                          </span>
                        </div>

                        <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1.5 line-clamp-2">
                          {a.testTitle || 'Untitled Test'}
                        </h2>

                        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2.5 gap-y-1 tabular-nums">
                          <span>{formatDateTime(a.submittedAt || a.startedAt)}</span>
                          {a.timeSpentSeconds > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{formatDurationCompact(a.timeSpentSeconds)}</span>
                            </>
                          )}
                        </div>

                        {isSubmitted && (
                          <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-white/[0.06] grid grid-cols-4 gap-2 text-center tabular-nums">
                            <div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">Score</div>
                              <div className="text-sm font-extrabold font-mono text-slate-900 dark:text-white">
                                {formatNumber(a.score)}/{formatNumber(a.totalMarks)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">Accuracy</div>
                              <div className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                                {formatNumber(a.accuracy, 1)}%
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">Percent</div>
                              <div className="text-sm font-extrabold font-mono text-indigo-600 dark:text-cyan-400">
                                {formatNumber(a.percentage, 1)}%
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">Attempted</div>
                              <div className="text-sm font-extrabold font-mono text-slate-900 dark:text-white">
                                {a.attemptedCount}/{a.totalQuestions}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-slate-200/70 dark:border-white/[0.06]">
                        {isSubmitted ? (
                          <>
                            <Link
                              to={`/results/${encodeURIComponent(a.attemptId)}`}
                              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-white/15 bg-white/70 dark:bg-white/[0.04] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-400 inline-flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Result
                            </Link>
                            <Link
                              to={`/solutions/${encodeURIComponent(a.attemptId)}`}
                              className="flex-1 py-2.5 px-3 rounded-xl btn-gradient text-xs font-bold inline-flex items-center justify-center gap-1.5"
                            >
                              <BookOpenCheck className="w-3.5 h-3.5" />
                              Review Answers
                            </Link>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/exam/${encodeURIComponent(a.testId)}/play?slug=${encodeURIComponent(
                                  a.seriesSlug || ''
                                )}`
                              )
                            }
                            className="flex-1 py-2.5 px-3 rounded-xl btn-gradient text-xs font-bold inline-flex items-center justify-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Resume Test
                          </button>
                        )}
                      </div>
                    </div>
                  </MotionCard>
                );
              })}
            </div>
          )}

          {/* Legacy V1 Attempts from /testbook/attempts */}
          {filter === 'all' && v1Attempts.length > 0 && (
            <MotionSection delay={0.1}>
              <section className="space-y-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Earlier V1 Attempts ({v1Attempts.length})
                </h2>
                <div className="rounded-2xl glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-500 dark:text-slate-400">
                          <th className="py-3 px-4 font-semibold">Test ID</th>
                          <th className="py-3 px-4 font-semibold">Date</th>
                          <th className="py-3 px-4 font-semibold text-right">Score</th>
                          <th className="py-3 px-4 font-semibold text-right">Duration</th>
                          <th className="py-3 px-4 font-semibold text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.06]">
                        {v1Attempts.slice(0, 15).map((item) => (
                          <tr key={item.id} className="hover:bg-indigo-50/35 dark:hover:bg-white/[0.03] transition-colors">
                            <td className="py-3 px-4 font-mono text-xs text-slate-900 dark:text-white">
                              {item.test_id}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                              {formatDateTime(item.created_at)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                              {formatNumber(item.score)} / {formatNumber(item.total_marks)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                              {formatDurationCompact(item.time_spent_seconds)}
                            </td>
                            <td className="py-3 px-4 text-right text-xs capitalize text-slate-600 dark:text-slate-300">
                              {item.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </MotionSection>
          )}
        </div>
      )}
    </div>
  );
}
