import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Flame,
  History,
  Layers,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { trendingService } from '../services/trendingService';
import { statsService } from '../services/statsService';
import { historyService } from '../services/historyService';
import { getTestTitle, testsService } from '../services/testsService';
import { searchService } from '../services/searchService';
import { normalizeV2Series } from '../services/seriesService';
import type {
  HistoryAttemptItem,
  NormalizedSeries,
  StatsResponse,
  TrendingSearchItem,
  V1TestItem,
} from '../types/testbook';
import { SeriesIcon } from '../components/SeriesIcon';
import { ErrorBanner, LoadingGrid } from '../components/StateViews';
import { AnimatedNumber, IconBox, MotionCard, MotionSection } from '../components/MotionPrimitives';
import {
  formatCompactCount,
  formatDateTime,
  formatDurationCompact,
  formatNumber,
} from '../utils/formatters';

function getRankBadgeClass(idx: number) {
  if (idx === 0) {
    return 'bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-950 shadow-[0_4px_12px_rgba(245,158,11,0.45)]';
  }
  if (idx === 1) {
    return 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 shadow-[0_4px_12px_rgba(148,163,184,0.35)]';
  }
  if (idx === 2) {
    return 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-[0_4px_12px_rgba(217,119,6,0.4)]';
  }
  return 'bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-400/35 text-indigo-600 dark:text-cyan-300';
}

export function HomePage() {
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    searchService.getRecentSearches()
  );

  const [trending, setTrending] = useState<TrendingSearchItem[]>([]);
  const [featuredSeries, setFeaturedSeries] = useState<NormalizedSeries[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [history, setHistory] = useState<HistoryAttemptItem[]>([]);
  const [freeTests, setFreeTests] = useState<V1TestItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [trendRes, homeRes, statsRes, histRes, catalogTestsRes] =
        await Promise.allSettled([
          trendingService.getTrendingTop10(),
          trendingService.getHomeFeed(),
          statsService.getStats(),
          historyService.getHistory(),
          testsService.getCatalogTests(6),
        ]);

      if (trendRes.status === 'fulfilled') {
        setTrending(trendRes.value);
      }
      if (homeRes.status === 'fulfilled') {
        const list = Array.isArray(homeRes.value.featured)
          ? homeRes.value.featured.map(normalizeV2Series)
          : [];
        setFeaturedSeries(list);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }
      if (histRes.status === 'fulfilled') {
        setHistory(histRes.value);
      }
      if (catalogTestsRes.status === 'fulfilled') {
        setFreeTests(catalogTestsRes.value.filter((t) => t.is_free).slice(0, 6));
      }

      if (
        trendRes.status === 'rejected' &&
        homeRes.status === 'rejected' &&
        histRes.status === 'rejected'
      ) {
        setError('Could not connect to the Testbook API. Please retry.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches(searchService.saveRecentSearch(trimmed));
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const resumableAttempts = history.filter((h) => h.status === 'in_progress');
  const recentSubmitted = history.filter((h) => h.status === 'submitted').slice(0, 5);

  return (
    <div className="space-y-10">
      {/* Workspace Header & Search */}
      <MotionSection>
        <section className="relative overflow-hidden rounded-3xl glass-card p-6 sm:p-8">
          <div
            className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-500/20 via-violet-500/15 to-cyan-500/20 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-cyan-400 mb-3">
              <Sparkles className="w-4 h-4" />
              <span>Exam Preparation Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
              Practice mock tests, analyze every attempt, and track exam accuracy.
            </h1>
            <p className="mt-2.5 text-sm sm:text-base text-slate-600 dark:text-slate-300">
              Explore full-length series, topic tests, bilingual exam simulations, and detailed step-by-step solutions.
            </p>

            <form onSubmit={handleSearchSubmit} className="mt-6 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-indigo-500 dark:text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search exams, test series, SSC, RRB, UPSC, CTET..."
                  aria-label="Search test series"
                  className="w-full h-12 pl-10 pr-10 rounded-xl border border-slate-300/80 dark:border-white/15 bg-white/80 dark:bg-[#0B0F19]/80 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="h-12 px-6 rounded-xl btn-gradient text-sm font-bold whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                Search Series
              </button>
            </form>

            {/* Recent searches */}
            {recentSearches.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Recent:</span>
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => navigate(`/search?q=${encodeURIComponent(item)}`)}
                    className="hover:text-indigo-600 dark:hover:text-cyan-400 underline-offset-4 hover:underline transition-colors"
                  >
                    {item}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setRecentSearches(searchService.clearRecentSearches())}
                  className="text-slate-400 hover:text-rose-500 ml-auto transition-colors"
                >
                  Clear history
                </button>
              </div>
            )}
          </div>
        </section>
      </MotionSection>

      {error && <ErrorBanner message={error} onRetry={loadDashboard} />}

      {/* Continue Test Banner (only when resumable in-progress attempts exist) */}
      {resumableAttempts.length > 0 && (
        <MotionSection delay={0.05}>
          <section aria-labelledby="continue-heading">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <IconBox tone="amber" size="sm">
                  <RotateCcw className="w-4 h-4" />
                </IconBox>
                <h2
                  id="continue-heading"
                  className="text-lg font-bold text-slate-900 dark:text-white"
                >
                  Continue Test
                </h2>
              </div>
              <Link
                to="/history?status=in_progress"
                className="text-xs font-semibold text-indigo-600 dark:text-cyan-400 hover:underline whitespace-nowrap"
              >
                View all in-progress
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resumableAttempts.slice(0, 2).map((attempt, idx) => (
                <MotionCard key={attempt.attemptId} index={idx}>
                  <div className="rounded-2xl glass-card-interactive p-5 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <IconBox tone="amber" size="md">
                        <Clock className="w-5 h-5" />
                      </IconBox>
                      <div className="min-w-0">
                        <div className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                          In Progress · {attempt.totalQuestions} Questions
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white truncate mt-0.5">
                          {attempt.testTitle || 'Untitled Test'}
                        </h3>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 truncate">
                          <span className="truncate">{attempt.seriesName || attempt.seriesSlug}</span>
                          <span aria-hidden="true">·</span>
                          <span className="shrink-0">Started {formatDateTime(attempt.startedAt)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/exam/${encodeURIComponent(attempt.testId)}/play?slug=${encodeURIComponent(
                            attempt.seriesSlug || ''
                          )}`
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl btn-gradient text-xs font-bold whitespace-nowrap shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Resume
                    </button>
                  </div>
                </MotionCard>
              ))}
            </div>
          </section>
        </MotionSection>
      )}

      {/* Performance Overview (from /testbookv2/stats) */}
      {stats?.summary && (
        <MotionSection delay={0.08}>
          <section aria-labelledby="perf-heading">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <IconBox tone="indigo" size="sm">
                  <Target className="w-4 h-4" />
                </IconBox>
                <h2 id="perf-heading" className="text-lg font-bold text-slate-900 dark:text-white">
                  Performance Overview
                </h2>
              </div>
              <Link
                to="/analytics"
                className="text-xs font-semibold text-indigo-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
              >
                Detailed Analytics <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MotionCard index={0}>
                <div className="rounded-2xl glass-card p-5 h-full">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Tests Submitted
                    </span>
                    <IconBox tone="indigo" size="sm">
                      <CheckCircle2 className="w-4 h-4" />
                    </IconBox>
                  </div>
                  <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
                    <AnimatedNumber value={stats.summary.testsSubmitted} />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    of {stats.summary.testsAttempted} attempted
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
                  <div className="text-2xl font-extrabold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-2">
                    <AnimatedNumber value={stats.summary.averageAccuracy} decimals={1} suffix="%" />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {stats.summary.totalQuestions} questions
                  </div>
                </div>
              </MotionCard>

              <MotionCard index={2}>
                <div className="rounded-2xl glass-card p-5 h-full">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Cumulative Score
                    </span>
                    <IconBox tone="cyan" size="sm">
                      <Award className="w-4 h-4" />
                    </IconBox>
                  </div>
                  <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
                    <AnimatedNumber value={stats.summary.totalScore} decimals={stats.summary.totalScore % 1 ? 1 : 0} />{' '}
                    <span className="text-base font-semibold text-slate-400">
                      / {formatNumber(stats.summary.totalMarks)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {formatNumber(stats.summary.overallPercentage, 2)}% overall
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
                  <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
                    {formatDurationCompact(stats.summary.totalTimeSeconds)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Active exam time
                  </div>
                </div>
              </MotionCard>
            </div>
          </section>
        </MotionSection>
      )}

      {/* Trending Exams Top 10 (GET /testbookv2/trending?limit=10) */}
      <MotionSection delay={0.1}>
        <section aria-labelledby="trending-heading">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <IconBox tone="amber" size="sm">
                <Flame className="w-4 h-4" />
              </IconBox>
              <h2 id="trending-heading" className="text-lg font-bold text-slate-900 dark:text-white">
                Trending Exam Searches
              </h2>
            </div>
            <Link
              to="/trending"
              className="text-xs font-semibold text-indigo-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
            >
              View Top 10 <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading && trending.length === 0 ? (
            <LoadingGrid count={5} columns={3} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {trending.slice(0, 10).map((item, idx) => (
                <MotionCard key={item.query} index={idx}>
                  <button
                    type="button"
                    onClick={() => navigate(`/search?q=${encodeURIComponent(item.query)}`)}
                    className="w-full h-full text-left rounded-2xl glass-card-interactive p-4 group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono tabular-nums text-xs font-extrabold ${getRankBadgeClass(
                          idx
                        )}`}
                      >
                        #{idx + 1}
                      </span>
                      <TrendingUp className="w-4 h-4 text-indigo-500 dark:text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white capitalize mt-2.5 truncate">
                      {item.query}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                      {formatCompactCount(item.count)} searches
                    </div>
                  </button>
                </MotionCard>
              ))}
            </div>
          )}
        </section>
      </MotionSection>

      {/* Popular / Featured Test Series */}
      <MotionSection delay={0.12}>
        <section aria-labelledby="series-heading">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <IconBox tone="indigo" size="sm">
                <Layers className="w-4 h-4" />
              </IconBox>
              <h2 id="series-heading" className="text-lg font-bold text-slate-900 dark:text-white">
                Popular Test Series
              </h2>
            </div>
            <Link
              to="/series"
              className="text-xs font-semibold text-indigo-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
            >
              Browse All Series <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading && featuredSeries.length === 0 ? (
            <LoadingGrid count={6} columns={3} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredSeries.slice(0, 6).map((series, idx) => (
                <MotionCard key={series.slug} index={idx}>
                  <Link
                    to={`/series/${encodeURIComponent(series.slug)}`}
                    className="h-full rounded-2xl glass-card-interactive p-5 flex flex-col justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-3.5">
                      <SeriesIcon src={series.icon} alt={series.name} />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-cyan-300 transition-colors">
                          {series.name}
                        </h3>
                        <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums">
                          <span>{series.totalTests} Tests</span>
                          {typeof series.freeTestCount === 'number' && series.freeTestCount > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                {series.freeTestCount} Free
                              </span>
                            </>
                          )}
                          {typeof series.totalAttempts === 'number' && series.totalAttempts > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{formatCompactCount(series.totalAttempts)} attempts</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 truncate">
                        {series.languages.slice(0, 3).join(' · ') || 'Bilingual'}
                      </span>
                      <span className="font-bold text-indigo-600 dark:text-cyan-400 whitespace-nowrap shrink-0 inline-flex items-center gap-1">
                        Explore Series
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </Link>
                </MotionCard>
              ))}
            </div>
          )}
        </section>
      </MotionSection>

      {/* Available Free Tests */}
      {freeTests.length > 0 && (
        <MotionSection delay={0.14}>
          <section aria-labelledby="free-tests-heading">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <IconBox tone="emerald" size="sm">
                  <Zap className="w-4 h-4" />
                </IconBox>
                <h2 id="free-tests-heading" className="text-lg font-bold text-slate-900 dark:text-white">
                  Available Free Tests
                </h2>
              </div>
              <Link
                to="/tests?filter=free"
                className="text-xs font-semibold text-indigo-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
              >
                All Free Tests <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {freeTests.map((t, idx) => (
                <MotionCard key={t.test_id} index={idx}>
                  <div className="h-full rounded-2xl glass-card-interactive p-5 flex flex-col justify-between gap-4">
                    <div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold truncate">
                        Free Mock Test · {t.seriesName || t.seriesSlug}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1 line-clamp-2">
                        {getTestTitle(t)}
                      </h3>
                      <div className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-400" />
                          {t.duration_mins} min
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{t.total_questions} Qs</span>
                        <span aria-hidden="true">·</span>
                        <span>{t.total_marks} Marks</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/exam/${encodeURIComponent(t.test_id)}/instructions?slug=${encodeURIComponent(
                            t.seriesSlug || ''
                          )}`
                        )
                      }
                      className="w-full py-2.5 px-4 rounded-xl btn-gradient text-xs font-bold inline-flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Start Free Test
                    </button>
                  </div>
                </MotionCard>
              ))}
            </div>
          </section>
        </MotionSection>
      )}

      {/* Recently Attempted Tests */}
      {recentSubmitted.length > 0 && (
        <MotionSection delay={0.16}>
          <section aria-labelledby="recent-history-heading">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <IconBox tone="violet" size="sm">
                  <History className="w-4 h-4" />
                </IconBox>
                <h2
                  id="recent-history-heading"
                  className="text-lg font-bold text-slate-900 dark:text-white"
                >
                  My Test History
                </h2>
              </div>
              <Link
                to="/history"
                className="text-xs font-semibold text-indigo-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
              >
                Full History <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="rounded-2xl glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-500 dark:text-slate-400">
                      <th className="py-3.5 px-4 font-semibold">Test</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Score</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Accuracy</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.06]">
                    {recentSubmitted.map((item) => (
                      <tr
                        key={item.attemptId}
                        className="hover:bg-indigo-50/40 dark:hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                            {item.testTitle || 'Untitled Test'}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {item.seriesName || item.seriesSlug} · {formatDateTime(item.submittedAt || item.startedAt)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatNumber(item.score)} / {formatNumber(item.totalMarks)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatNumber(item.accuracy, 1)}%
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-3 text-xs font-bold">
                            <Link
                              to={`/results/${encodeURIComponent(item.attemptId)}`}
                              className="text-indigo-600 dark:text-cyan-400 hover:underline"
                            >
                              Result
                            </Link>
                            <Link
                              to={`/solutions/${encodeURIComponent(item.attemptId)}`}
                              className="text-slate-600 dark:text-slate-300 hover:underline"
                            >
                              Solutions
                            </Link>
                          </div>
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
  );
}
