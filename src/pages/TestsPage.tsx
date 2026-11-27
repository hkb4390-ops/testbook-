import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardList, Clock, Lock, Play, RotateCcw, Search } from 'lucide-react';
import { getTestTitle, testsService } from '../services/testsService';
import { historyService } from '../services/historyService';
import type { HistoryAttemptItem, V1TestItem } from '../types/testbook';
import { EmptyState, ErrorBanner, LoadingGrid } from '../components/StateViews';
import { IconBox, MotionCard, MotionSection } from '../components/MotionPrimitives';

export function TestsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') === 'free' ? 'free' : 'all';

  const [tests, setTests] = useState<V1TestItem[]>([]);
  const [inProgressMap, setInProgressMap] = useState<Map<string, HistoryAttemptItem>>(
    new Map()
  );
  const [filterMode, setFilterMode] = useState<'all' | 'free' | 'attempted'>(initialFilter);
  const [selectedSeries, setSelectedSeries] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogRes, histRes] = await Promise.allSettled([
        testsService.getCatalogTests(10),
        historyService.getHistory(),
      ]);

      if (catalogRes.status === 'fulfilled') {
        setTests(catalogRes.value);
      } else {
        throw catalogRes.reason;
      }

      if (histRes.status === 'fulfilled') {
        const map = new Map<string, HistoryAttemptItem>();
        for (const h of histRes.value) {
          if (h.status === 'in_progress') {
            map.set(h.testId, h);
          }
        }
        setInProgressMap(map);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, []);

  const seriesOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tests) {
      if (t.seriesSlug) {
        map.set(t.seriesSlug, t.seriesName || t.seriesSlug);
      }
    }
    return Array.from(map.entries());
  }, [tests]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of tests) {
      if (t.category) set.add(t.category);
    }
    return ['All', ...Array.from(set).sort()];
  }, [tests]);

  const filteredTests = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tests.filter((t) => {
      if (filterMode === 'free' && !t.is_free) return false;
      if (filterMode === 'attempted' && !t.is_attempted) return false;
      if (selectedSeries !== 'All' && t.seriesSlug !== selectedSeries) return false;
      if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
      if (q) {
        const title = getTestTitle(t).toLowerCase();
        const sName = (t.seriesName || '').toLowerCase();
        return title.includes(q) || sName.includes(q);
      }
      return true;
    });
  }, [tests, filterMode, selectedSeries, selectedCategory, query]);

  const updateFilterMode = (mode: 'all' | 'free' | 'attempted') => {
    setFilterMode(mode);
    if (mode === 'free') {
      setSearchParams({ filter: 'free' });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="space-y-6">
      <MotionSection>
        <div className="flex items-start gap-3.5">
          <IconBox tone="cyan" size="lg">
            <ClipboardList className="w-5 h-5" />
          </IconBox>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Available Tests
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Browse free mock tests, chapter tests, and full-length assessments directly from active series.
            </p>
          </div>
        </div>
      </MotionSection>

      {/* Filters */}
      <MotionSection delay={0.04}>
        <div className="rounded-2xl glass-card p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-indigo-500 dark:text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tests by title or exam..."
                aria-label="Search available tests"
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-300/80 dark:border-white/15 bg-white/80 dark:bg-[#0B0F19]/80 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by exam category"
              className="h-10 px-3 rounded-xl border border-slate-300/80 dark:border-white/15 bg-white/80 dark:bg-[#0B0F19]/80 text-sm text-slate-900 dark:text-slate-100"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Exam Categories' : c}
                </option>
              ))}
            </select>

            <select
              value={selectedSeries}
              onChange={(e) => setSelectedSeries(e.target.value)}
              aria-label="Filter by test series"
              className="h-10 px-3 rounded-xl border border-slate-300/80 dark:border-white/15 bg-white/80 dark:bg-[#0B0F19]/80 text-sm text-slate-900 dark:text-slate-100 max-w-xs"
            >
              <option value="All">All Test Series</option>
              {seriesOptions.map(([slug, name]) => (
                <option key={slug} value={slug}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Segmented Filter Controls */}
          <div className="flex items-center gap-1 p-1 bg-slate-100/90 dark:bg-[#0B0F19]/80 border border-slate-200/70 dark:border-white/[0.06] rounded-xl w-fit">
            <button
              type="button"
              onClick={() => updateFilterMode('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterMode === 'all'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({tests.length})
            </button>
            <button
              type="button"
              onClick={() => updateFilterMode('free')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterMode === 'free'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Free Tests ({tests.filter((t) => t.is_free).length})
            </button>
            <button
              type="button"
              onClick={() => updateFilterMode('attempted')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterMode === 'attempted'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Attempted ({tests.filter((t) => t.is_attempted).length})
            </button>
          </div>
        </div>
      </MotionSection>

      {error && <ErrorBanner message={error} onRetry={loadTests} />}

      {loading ? (
        <LoadingGrid count={8} columns={2} />
      ) : filteredTests.length === 0 ? (
        <EmptyState
          title="No tests match your filters"
          description="Try resetting the series filter or switching back to All Tests."
          actionLabel="Reset Filters"
          onAction={() => {
            updateFilterMode('all');
            setSelectedCategory('All');
            setSelectedSeries('All');
            setQuery('');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTests.slice(0, 60).map((t, idx) => {
            const resumable = inProgressMap.get(t.test_id);
            const slug = t.seriesSlug || '';
            return (
              <MotionCard key={`${slug}-${t.test_id}`} index={idx}>
                <div className="h-full rounded-2xl glass-card-interactive p-5 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span
                        className={`font-bold truncate ${
                          t.is_free
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {t.is_free ? 'Free Test' : 'Pro Test'}
                        {t.seriesName ? ` · ${t.seriesName}` : ''}
                      </span>
                      {t.is_attempted && (
                        <span className="text-indigo-600 dark:text-cyan-400 font-semibold shrink-0">
                          Attempted
                        </span>
                      )}
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
                      {getTestTitle(t)}
                    </h2>
                    <div className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2.5 gap-y-1 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-400" />
                        {t.duration_mins} min
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{t.total_questions} Questions</span>
                      <span aria-hidden="true">·</span>
                      <span>{t.total_marks} Marks</span>
                      {t.languages && t.languages.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{t.languages.join(', ')}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-200/70 dark:border-white/[0.06]">
                    {resumable ? (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/exam/${encodeURIComponent(t.test_id)}/play?slug=${encodeURIComponent(
                              slug
                            )}`
                          )
                        }
                        className="flex-1 py-2.5 px-4 rounded-xl btn-gradient text-xs font-bold inline-flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Resume Test
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/exam/${encodeURIComponent(
                              t.test_id
                            )}/instructions?slug=${encodeURIComponent(slug)}`
                          )
                        }
                        className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all ${
                          t.is_free
                            ? 'btn-gradient'
                            : 'bg-slate-100/90 dark:bg-white/[0.07] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-white/10'
                        }`}
                      >
                        {t.is_free ? <Play className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        {t.is_free ? 'Start Test' : 'Check Access & Start'}
                      </button>
                    )}
                  </div>
                </div>
              </MotionCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
