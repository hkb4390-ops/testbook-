import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Lock, Play, RotateCcw } from 'lucide-react';
import { seriesService } from '../services/seriesService';
import { getTestTitle, testsService } from '../services/testsService';
import { historyService } from '../services/historyService';
import type {
  HistoryAttemptItem,
  NormalizedSeries,
  V1TestItem,
} from '../types/testbook';
import { SeriesIcon } from '../components/SeriesIcon';
import { EmptyState, ErrorBanner, LoadingGrid } from '../components/StateViews';
import { MotionCard, MotionSection } from '../components/MotionPrimitives';
import { formatCompactCount, stripHtml } from '../utils/formatters';

export function SeriesDetailPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();

  const [series, setSeries] = useState<NormalizedSeries | null>(null);
  const [tests, setTests] = useState<V1TestItem[]>([]);
  const [inProgressMap, setInProgressMap] = useState<Map<string, HistoryAttemptItem>>(
    new Map()
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string>('all');
  const [freeOnly, setFreeOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const [detailRes, testsRes, historyRes] = await Promise.allSettled([
        seriesService.getSeriesDetail(slug),
        testsService.getSeriesTests(slug),
        historyService.getHistory(),
      ]);

      if (detailRes.status === 'fulfilled') {
        setSeries(detailRes.value);
      } else {
        throw detailRes.reason;
      }

      if (testsRes.status === 'fulfilled') {
        setTests(testsRes.value);
      }

      if (historyRes.status === 'fulfilled') {
        const map = new Map<string, HistoryAttemptItem>();
        for (const h of historyRes.value) {
          if (h.status === 'in_progress') {
            map.set(h.testId, h);
          }
        }
        setInProgressMap(map);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test series details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [slug]);

  const sections = series?.sections || [];

  const sectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tests) {
      if (t.section_id) {
        counts.set(t.section_id, (counts.get(t.section_id) || 0) + 1);
      }
    }
    return counts;
  }, [tests]);

  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      if (selectedSectionId !== 'all' && t.section_id !== selectedSectionId) return false;
      if (freeOnly && !t.is_free) return false;
      return true;
    });
  }, [tests, selectedSectionId, freeOnly]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 rounded-2xl glass-card animate-pulse" />
        <LoadingGrid count={6} columns={2} />
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="space-y-4">
        <Link
          to="/series"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-400"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Test Series
        </Link>
        <ErrorBanner
          message={error || 'Series not found'}
          onRetry={loadData}
        />
      </div>
    );
  }

  const descriptionText = stripHtml(series.description);

  return (
    <div className="space-y-6">
      <Link
        to="/series"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> All Test Series
      </Link>

      {/* Series Overview Header */}
      <MotionSection>
        <section className="rounded-3xl glass-card p-6 relative overflow-hidden">
          <div
            className="pointer-events-none absolute -top-20 -right-20 w-52 h-52 rounded-full bg-gradient-to-br from-indigo-500/15 to-cyan-500/15 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex flex-col sm:flex-row sm:items-start gap-4">
            <SeriesIcon src={series.icon} alt={series.name} className="w-14 h-14" />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                {series.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                <span>{series.totalTests} Total Tests</span>
                {typeof series.freeTestCount === 'number' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {series.freeTestCount} Free Tests
                    </span>
                  </>
                )}
                {typeof series.paidTestCount === 'number' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{series.paidTestCount} Pro Tests</span>
                  </>
                )}
                {typeof series.totalAttempts === 'number' && series.totalAttempts > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{formatCompactCount(series.totalAttempts)} Total Attempts</span>
                  </>
                )}
                {series.languages.length > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{series.languages.join(', ')}</span>
                  </>
                )}
              </div>
              {descriptionText && (
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
                  {descriptionText}
                </p>
              )}
            </div>
          </div>
        </section>
      </MotionSection>

      {/* Section Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setSelectedSectionId('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
              selectedSectionId === 'all'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                : 'glass-card text-slate-600 dark:text-slate-300'
            }`}
          >
            All Available Tests ({tests.length})
          </button>
          {sections
            .filter((sec) => (sectionCounts.get(sec.id) || 0) > 0 || (sec.freeTestCount || 0) + (sec.paidTestCount || 0) > 0)
            .slice(0, 12)
            .map((sec) => {
              const loadedCount = sectionCounts.get(sec.id) || 0;
              const catalogCount = (sec.freeTestCount || 0) + (sec.paidTestCount || 0);
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSelectedSectionId(sec.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                    selectedSectionId === sec.id
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                      : 'glass-card text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {sec.shortName || sec.name} ({loadedCount > 0 ? loadedCount : catalogCount})
                </button>
              );
            })}
        </div>

        <button
          type="button"
          onClick={() => setFreeOnly((prev) => !prev)}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border whitespace-nowrap shrink-0 transition-all self-start sm:self-auto ${
            freeOnly
              ? 'btn-gradient border-transparent'
              : 'glass-card text-slate-700 dark:text-slate-300 hover:border-indigo-500'
          }`}
        >
          Free Only
        </button>
      </div>

      {/* Tests List */}
      {filteredTests.length === 0 ? (
        <EmptyState
          title="No tests listed in this section"
          description={
            tests.length === 0
              ? 'This series exposes catalog metadata in Testbook V2, while individual tests for this pack are not currently populated on the upstream V1 test list endpoint.'
              : 'No tests match the selected section or free filter.'
          }
          actionLabel={selectedSectionId !== 'all' || freeOnly ? 'Show All Tests' : undefined}
          onAction={() => {
            setSelectedSectionId('all');
            setFreeOnly(false);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTests.map((t, idx) => {
            const resumable = inProgressMap.get(t.test_id);
            return (
              <MotionCard key={t.test_id} index={idx}>
                <div className="h-full rounded-2xl glass-card-interactive p-5 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span
                        className={`font-bold ${
                          t.is_free
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {t.is_free ? 'Free Test' : 'Pro Test'}
                      </span>
                      {t.is_attempted && (
                        <span className="text-indigo-600 dark:text-cyan-400 font-semibold">
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
