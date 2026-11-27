import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Flame, Search, TrendingUp } from 'lucide-react';
import { trendingService } from '../services/trendingService';
import { normalizeV2Series } from '../services/seriesService';
import type { NormalizedSeries, TrendingSearchItem } from '../types/testbook';
import { SeriesIcon } from '../components/SeriesIcon';
import { EmptyState, ErrorBanner, LoadingGrid } from '../components/StateViews';
import { AnimatedNumber, IconBox, MotionCard, MotionSection } from '../components/MotionPrimitives';

function getRankBadgeClass(idx: number) {
  if (idx === 0) {
    return 'bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-950 shadow-[0_4px_14px_rgba(245,158,11,0.45)]';
  }
  if (idx === 1) {
    return 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 shadow-[0_4px_14px_rgba(148,163,184,0.35)]';
  }
  if (idx === 2) {
    return 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-[0_4px_14px_rgba(217,119,6,0.4)]';
  }
  return 'bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-400/35 text-indigo-600 dark:text-cyan-300';
}

export function TrendingPage() {
  const navigate = useNavigate();
  const [searches, setSearches] = useState<TrendingSearchItem[]>([]);
  const [featured, setFeatured] = useState<NormalizedSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrending = async () => {
    setLoading(true);
    setError(null);
    try {
      const [trendRes, homeRes] = await Promise.allSettled([
        trendingService.getTrendingTop10(),
        trendingService.getHomeFeed(),
      ]);

      if (trendRes.status === 'fulfilled') {
        setSearches(trendRes.value);
      } else {
        throw trendRes.reason;
      }

      if (homeRes.status === 'fulfilled' && Array.isArray(homeRes.value.featured)) {
        setFeatured(homeRes.value.featured.map(normalizeV2Series));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trending data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrending();
  }, []);

  return (
    <div className="space-y-8">
      <MotionSection>
        <div className="flex items-start gap-3.5">
          <IconBox tone="amber" size="lg">
            <Flame className="w-5 h-5" />
          </IconBox>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Trending Exams &amp; Top 10 Searches
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Live top 10 exam queries and popular series from Testbook V2.
            </p>
          </div>
        </div>
      </MotionSection>

      {error && <ErrorBanner message={error} onRetry={loadTrending} />}

      {loading ? (
        <LoadingGrid count={10} columns={2} />
      ) : searches.length === 0 ? (
        <EmptyState
          title="No trending items available"
          description="The trending endpoint returned no entries right now."
          actionLabel="Refresh"
          onAction={loadTrending}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {searches.slice(0, 10).map((item, idx) => (
            <MotionCard key={item.query} index={idx}>
              <button
                type="button"
                onClick={() => navigate(`/search?q=${encodeURIComponent(item.query)}`)}
                className={`w-full h-full text-left rounded-2xl glass-card-interactive p-5 flex flex-col justify-between gap-3 group ${
                  idx === 0 ? 'ring-1 ring-amber-400/50' : ''
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono tabular-nums font-extrabold ${getRankBadgeClass(
                      idx
                    )}`}
                  >
                    #{idx + 1}
                  </span>
                  <TrendingUp className="w-4 h-4 text-indigo-500 dark:text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-900 dark:text-white capitalize">
                    {item.query}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <AnimatedNumber value={item.count} /> searches
                    {typeof item.delta === 'number' && item.delta > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400 ml-1.5 font-semibold">
                        +{item.delta}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs font-bold text-indigo-600 dark:text-cyan-400 inline-flex items-center gap-1 pt-2 border-t border-slate-200/70 dark:border-white/[0.06]">
                  <Search className="w-3.5 h-3.5" />
                  Explore Series
                </div>
              </button>
            </MotionCard>
          ))}
        </div>
      )}

      {featured.length > 0 && (
        <MotionSection delay={0.1}>
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Featured Test Series
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.slice(0, 9).map((series, idx) => (
                <MotionCard key={series.slug} index={idx}>
                  <Link
                    to={`/series/${encodeURIComponent(series.slug)}`}
                    className="h-full rounded-2xl glass-card-interactive p-5 flex items-start justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <SeriesIcon src={series.icon} alt={series.name} />
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-cyan-300 transition-colors">
                          {series.name}
                        </h3>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                          {series.totalTests} Tests
                          {typeof series.freeTestCount === 'number' && series.freeTestCount > 0
                            ? ` · ${series.freeTestCount} Free`
                            : ''}
                        </div>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-indigo-500 dark:text-cyan-400 shrink-0 mt-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </Link>
                </MotionCard>
              ))}
            </div>
          </section>
        </MotionSection>
      )}
    </div>
  );
}
