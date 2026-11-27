import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Layers, Search, X } from 'lucide-react';
import { seriesService } from '../services/seriesService';
import { searchService } from '../services/searchService';
import type { NormalizedSeries } from '../types/testbook';
import { SeriesIcon } from '../components/SeriesIcon';
import { EmptyState, ErrorBanner, LoadingGrid } from '../components/StateViews';
import { IconBox, MotionCard, MotionSection } from '../components/MotionPrimitives';
import { formatCompactCount } from '../utils/formatters';

export function SeriesListPage() {
  const [seriesList, setSeriesList] = useState<NormalizedSeries[]>([]);
  const [searchResults, setSearchResults] = useState<NormalizedSeries[] | null>(null);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [freeOnly, setFreeOnly] = useState(false);
  const [selectedLang, setSelectedLang] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSeries = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await seriesService.getAllSeries();
      setSeriesList(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test series.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSeries();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchService.search(trimmed);
        setSearchResults(res);
      } catch {
        setSearchResults(null);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of seriesList) {
      if (s.category) set.add(s.category);
    }
    return ['All', ...Array.from(set).sort()];
  }, [seriesList]);

  const languages = useMemo(() => {
    const set = new Set<string>();
    for (const s of seriesList) {
      for (const l of s.languages) {
        if (l) set.add(l);
      }
    }
    return ['All', ...Array.from(set).sort()];
  }, [seriesList]);

  const visibleSeries = useMemo(() => {
    const source = searchResults !== null ? searchResults : seriesList;
    return source.filter((s) => {
      if (selectedCategory !== 'All' && s.category !== selectedCategory) return false;
      if (selectedLang !== 'All' && !s.languages.includes(selectedLang)) return false;
      if (freeOnly && !(s.isFree || (s.freeTestCount && s.freeTestCount > 0))) return false;
      if (searchResults === null && query.trim()) {
        const q = query.trim().toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          (s.category || '').toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [seriesList, searchResults, selectedCategory, selectedLang, freeOnly, query]);

  return (
    <div className="space-y-6">
      <MotionSection>
        <div className="flex items-start gap-3.5">
          <IconBox tone="indigo" size="lg">
            <Layers className="w-5 h-5" />
          </IconBox>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Test Series Catalog
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Explore structured mock test packs across competitive exams, subject packs, and previous year papers.
            </p>
          </div>
        </div>
      </MotionSection>

      {/* Filter & Search Toolbar */}
      <MotionSection delay={0.04}>
        <div className="rounded-2xl glass-card p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-indigo-500 dark:text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search series by exam name or subject..."
                aria-label="Filter test series"
                className="w-full h-10 pl-10 pr-9 rounded-xl border border-slate-300/80 dark:border-white/15 bg-white/80 dark:bg-[#0B0F19]/80 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                aria-label="Filter by language"
                className="h-10 px-3 rounded-xl border border-slate-300/80 dark:border-white/15 bg-white/80 dark:bg-[#0B0F19]/80 text-sm text-slate-900 dark:text-slate-100"
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang === 'All' ? 'All Languages' : lang}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setFreeOnly((prev) => !prev)}
                className={`h-10 px-4 rounded-xl text-sm font-semibold border transition-all whitespace-nowrap ${
                  freeOnly
                    ? 'btn-gradient border-transparent'
                    : 'bg-white/80 dark:bg-[#0B0F19]/80 text-slate-700 dark:text-slate-300 border-slate-300/80 dark:border-white/15 hover:border-indigo-500'
                }`}
              >
                Free Tests Available
              </button>
            </div>
          </div>

          {/* Category Segmented Buttons */}
          {categories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                    selectedCategory === cat
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                      : 'bg-slate-100/80 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </MotionSection>

      {error && <ErrorBanner message={error} onRetry={loadSeries} />}

      {loading || searching ? (
        <LoadingGrid count={9} columns={3} />
      ) : visibleSeries.length === 0 ? (
        <EmptyState
          title="No matching test series"
          description="Try clearing your category or language filters, or search with a broader exam keyword."
          actionLabel="Reset Filters"
          onAction={() => {
            setQuery('');
            setSelectedCategory('All');
            setSelectedLang('All');
            setFreeOnly(false);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleSeries.map((series, idx) => (
            <MotionCard key={`${series.slug}-${series.id}`} index={idx}>
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
                    <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums">
                      {series.category && <span>{series.category}</span>}
                      {series.category && <span aria-hidden="true">·</span>}
                      <span>{series.totalTests} Tests</span>
                      {typeof series.freeTestCount === 'number' && series.freeTestCount > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {series.freeTestCount} Free
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 truncate">
                    {series.languages.join(' · ') || 'English'}
                    {typeof series.totalAttempts === 'number' && series.totalAttempts > 0
                      ? ` · ${formatCompactCount(series.totalAttempts)} attempts`
                      : ''}
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-cyan-400 whitespace-nowrap shrink-0 inline-flex items-center gap-1">
                    Open Series
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            </MotionCard>
          ))}
        </div>
      )}
    </div>
  );
}
