import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Search, TrendingUp, X } from 'lucide-react';
import { searchService } from '../services/searchService';
import { trendingService } from '../services/trendingService';
import type { NormalizedSeries, TrendingSearchItem } from '../types/testbook';
import { SeriesIcon } from '../components/SeriesIcon';
import { EmptyState, ErrorBanner, LoadingGrid } from '../components/StateViews';
import { IconBox, MotionCard, MotionSection } from '../components/MotionPrimitives';
import { formatCompactCount } from '../utils/formatters';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';

  const [input, setInput] = useState(urlQuery);
  const [results, setResults] = useState<NormalizedSeries[]>([]);
  const [trending, setTrending] = useState<TrendingSearchItem[]>([]);
  const [recent, setRecent] = useState<string[]>(() => searchService.getRecentSearches());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trendingService.getTrendingTop10().then(setTrending).catch(() => {});
  }, []);

  useEffect(() => {
    setInput(urlQuery);
    if (!urlQuery.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    searchService
      .search(urlQuery)
      .then((data) => {
        if (!cancelled) {
          setResults(data);
          setRecent(searchService.saveRecentSearch(urlQuery));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Search failed.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [urlQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      setSearchParams({});
      return;
    }
    setSearchParams({ q: trimmed });
  };

  return (
    <div className="space-y-6">
      <MotionSection>
        <div className="flex items-start gap-3.5">
          <IconBox tone="indigo" size="lg">
            <Search className="w-5 h-5" />
          </IconBox>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Search Exams &amp; Test Series
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Live search across Testbook V2 test series by exam name, slug, or subject.
            </p>
          </div>
        </div>
      </MotionSection>

      <MotionSection delay={0.04}>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-indigo-500 dark:text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type an exam name (e.g. ssc, rrb, upsc, bank, ctet)..."
              aria-label="Search test series"
              className="w-full h-12 pl-10 pr-10 rounded-xl border border-slate-300/80 dark:border-white/15 glass-card text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {input && (
              <button
                type="button"
                onClick={() => {
                  setInput('');
                  setSearchParams({});
                }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="h-12 px-6 rounded-xl btn-gradient text-sm font-bold whitespace-nowrap"
          >
            Search
          </button>
        </form>
      </MotionSection>

      {/* Suggestions & Recent Searches */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {recent.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Recent:</span>
            {recent.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setSearchParams({ q })}
                className="px-2.5 py-1 rounded-lg glass-card text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors"
              >
                {q}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRecent(searchService.clearRecentSearches())}
              className="text-slate-400 hover:text-rose-500 transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        {trending.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300 inline-flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-400" /> Trending:
            </span>
            {trending.slice(0, 6).map((t) => (
              <button
                key={t.query}
                type="button"
                onClick={() => setSearchParams({ q: t.query })}
                className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-400/25 text-indigo-700 dark:text-cyan-300 hover:bg-indigo-500/20 capitalize transition-colors"
              >
                {t.query}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <ErrorBanner
          message={error}
          onRetry={() => setSearchParams({ q: urlQuery })}
        />
      )}

      {loading ? (
        <LoadingGrid count={6} columns={3} />
      ) : urlQuery.trim() && results.length === 0 && !error ? (
        <EmptyState
          title={`No results for "${urlQuery}"`}
          description="Try another exam keyword like SSC, RRB, UPSC, Bank, Defence, or CTET."
          actionLabel="Clear Search"
          onAction={() => {
            setInput('');
            setSearchParams({});
          }}
        />
      ) : results.length > 0 ? (
        <div className="space-y-3">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Showing {results.length} matching series for &ldquo;{urlQuery}&rdquo;
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((series, idx) => (
              <MotionCard key={series.id} index={idx}>
                <Link
                  to={`/series/${encodeURIComponent(series.slug)}`}
                  className="h-full rounded-2xl glass-card-interactive p-5 flex flex-col justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3.5">
                    <SeriesIcon src={series.icon} alt={series.name} />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-cyan-300 transition-colors">
                        {series.name}
                      </h2>
                      <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 tabular-nums">
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
                      {series.languages.join(' · ') || 'English'}
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-cyan-400 whitespace-nowrap inline-flex items-center gap-1">
                      View Tests
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </Link>
              </MotionCard>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
