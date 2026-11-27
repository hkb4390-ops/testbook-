import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Grid3X3,
  X,
} from 'lucide-react';
import { solutionsService } from '../services/solutionsService';
import { getLanguageLabel } from '../config/apiConfig';
import { usePreferences } from '../context/PreferencesContext';
import type { AttemptSolutionsResponse, SolutionQuestionItem } from '../types/testbook';
import { MathHtml } from '../components/MathHtml';
import { EmptyState, ErrorBanner } from '../components/StateViews';
import { formatNumber, isSafeExternalUrl } from '../utils/formatters';

type SolFilter =
  | 'all'
  | 'correct'
  | 'incorrect'
  | 'skipped'
  | 'partial'
  | 'unscored'
  | 'bookmarked';

const STATUS_LABELS: Record<string, { label: string; textClass: string }> = {
  correct: { label: 'Correct', textClass: 'text-emerald-600 dark:text-emerald-400' },
  incorrect: { label: 'Incorrect', textClass: 'text-rose-600 dark:text-rose-400' },
  partial: { label: 'Partially Correct', textClass: 'text-amber-600 dark:text-amber-400' },
  skipped: { label: 'Skipped', textClass: 'text-slate-500 dark:text-slate-400' },
  unscored: { label: 'Not Graded', textClass: 'text-indigo-600 dark:text-cyan-400' },
};

export function SolutionsPage() {
  const { attemptId = '' } = useParams();
  const { defaultLanguage } = usePreferences();

  const [data, setData] = useState<AttemptSolutionsResponse | null>(null);
  const [lang, setLang] = useState(defaultLanguage || 'en');
  const [sectionId, setSectionId] = useState<string>('');
  const [filter, setFilter] = useState<SolFilter>('all');
  const [cursor, setCursor] = useState(0);
  const [expOpen, setExpOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSolutions = async (targetLang?: string) => {
    if (!attemptId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await solutionsService.getAttemptSolutions(attemptId, targetLang || lang);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Solutions could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSolutions(lang);
  }, [attemptId, lang]);

  const questions = data?.questions || [];

  const availableLangs = useMemo(() => {
    const set = new Set<string>();
    for (const q of questions) {
      for (const l of q.availableSolutionLangs || []) set.add(l);
    }
    return Array.from(set);
  }, [questions]);

  const sections = useMemo(() => {
    const list: Array<{ id: string; title: string; count: number }> = [];
    for (const q of questions) {
      const id = q.sectionId || '';
      const existing = list.find((s) => s.id === id);
      if (existing) {
        existing.count += 1;
      } else {
        list.push({ id, title: q.sectionTitle || 'Section', count: 1 });
      }
    }
    return list;
  }, [questions]);

  const filteredQuestions: SolutionQuestionItem[] = useMemo(() => {
    return questions.filter((q) => {
      if (sectionId && (q.sectionId || '') !== sectionId) return false;
      if (filter === 'bookmarked') return q.isBookmarked === true;
      if (filter === 'all') return true;
      return q.status === filter;
    });
  }, [questions, sectionId, filter]);

  useEffect(() => {
    if (cursor >= filteredQuestions.length) {
      setCursor(0);
    }
  }, [filteredQuestions.length, cursor]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 rounded-2xl glass-card" />
        <div className="h-72 rounded-3xl glass-card" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          to={`/results/${encodeURIComponent(attemptId)}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-400"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Result
        </Link>
        <ErrorBanner
          title="Solutions Unavailable"
          message={error || 'Solutions are not available for this attempt yet.'}
          onRetry={() => loadSolutions(lang)}
        />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="space-y-4">
        <Link
          to={`/results/${encodeURIComponent(attemptId)}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-400"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Result
        </Link>
        <EmptyState
          title="Solutions Not Available"
          description="No question-level solutions were returned by the backend for this attempt."
        />
      </div>
    );
  }

  const currentQ = filteredQuestions[cursor];
  const statusInfo = currentQ
    ? STATUS_LABELS[currentQ.status] || {
        label: currentQ.status || 'Attempted',
        textClass: 'text-slate-500',
      }
    : null;

  const correctList = currentQ
    ? currentQ.multiCorrectOptions && currentQ.multiCorrectOptions.length > 0
      ? currentQ.multiCorrectOptions.map(String)
      : currentQ.correctOption !== null && currentQ.correctOption !== undefined
      ? [String(currentQ.correctOption)]
      : []
    : [];

  const markedList = currentQ?.markedOption
    ? String(currentQ.markedOption)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const hasKey = correctList.length > 0;
  const options = currentQ?.options || [];
  const isNumeric =
    currentQ &&
    options.length === 0 &&
    (currentQ.questionType === 'numeric' || markedList.length > 0 || hasKey);

  const breadcrumb = currentQ
    ? [currentQ.subject, currentQ.chapter, currentQ.topic, currentQ.subtopic]
        .filter(Boolean)
        .join(' › ')
    : '';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/results/${encodeURIComponent(attemptId)}`}
            className="p-2.5 rounded-xl glass-card text-slate-700 dark:text-slate-200 hover:border-indigo-400 transition-colors"
            aria-label="Back to result"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white truncate">
              {data.testTitle || 'Solutions Review'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Question {filteredQuestions.length > 0 ? cursor + 1 : 0} of{' '}
              {filteredQuestions.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {availableLangs.length > 0 && (
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              aria-label="Solution language"
              className="h-9 px-3 rounded-xl glass-card text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              {availableLangs.map((code) => (
                <option key={code} value={code}>
                  {getLanguageLabel(code)}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="h-9 px-3.5 rounded-xl glass-card text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 hover:border-indigo-400 transition-colors"
          >
            <Grid3X3 className="w-4 h-4 text-indigo-500 dark:text-cyan-400" />
            Palette
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      {sections.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => {
              setSectionId('');
              setCursor(0);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
              sectionId === ''
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                : 'glass-card text-slate-600 dark:text-slate-300'
            }`}
          >
            All Sections ({questions.length})
          </button>
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSectionId(s.id);
                setCursor(0);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                sectionId === s.id
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                  : 'glass-card text-slate-600 dark:text-slate-300'
              }`}
            >
              {s.title} ({s.count})
            </button>
          ))}
        </div>
      )}

      {/* Status Filter Segmented Controls */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {(
          [
            ['all', 'All'],
            ['correct', 'Correct'],
            ['incorrect', 'Incorrect'],
            ['skipped', 'Skipped'],
            ['partial', 'Partial'],
            ['unscored', 'Unscored'],
            ['bookmarked', 'Marked for Review'],
          ] as Array<[SolFilter, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setFilter(key);
              setCursor(0);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
              filter === key
                ? 'btn-gradient'
                : 'glass-card text-slate-600 dark:text-slate-300 hover:border-indigo-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Question Card */}
      {!currentQ ? (
        <EmptyState
          title="No questions match this filter"
          description="Switch back to All to review every question in this attempt."
          actionLabel="Show All Questions"
          onAction={() => {
            setFilter('all');
            setSectionId('');
            setCursor(0);
          }}
        />
      ) : (
        <motion.div
          key={currentQ.questionId}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4"
        >
          {currentQ.comprehension && (
            <div className="rounded-2xl glass-card p-4 max-h-52 overflow-y-auto">
              <div className="text-xs font-bold text-indigo-600 dark:text-cyan-400 mb-2">
                Comprehension Passage
              </div>
              <MathHtml
                html={currentQ.comprehension}
                className="text-sm text-slate-700 dark:text-slate-300"
              />
            </div>
          )}

          <article className="rounded-3xl glass-card p-5 sm:p-6 space-y-5">
            {/* Metadata */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/70 dark:border-white/[0.08] text-xs">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-extrabold font-mono tabular-nums text-indigo-600 dark:text-cyan-400">
                  Q{currentQ.qsNo || currentQ.questionOrder || cursor + 1}
                </span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                  ·
                </span>
                <span className={`font-bold ${statusInfo?.textClass}`}>
                  {statusInfo?.label}
                </span>
                {currentQ.sectionTitle && (
                  <>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                      ·
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {currentQ.sectionTitle}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                <span
                  className={
                    currentQ.marksAwarded > 0
                      ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                      : currentQ.marksAwarded < 0
                      ? 'text-rose-600 dark:text-rose-400 font-bold'
                      : ''
                  }
                >
                  {currentQ.marksAwarded > 0 ? '+' : ''}
                  {formatNumber(currentQ.marksAwarded)} marks
                </span>
                {typeof currentQ.timeSpent === 'number' && (
                  <span>{currentQ.timeSpent}s</span>
                )}
              </div>
            </div>

            {/* Question Body */}
            <MathHtml
              html={currentQ.questionHtml}
              fallbackText="Question text unavailable."
              className="text-sm sm:text-base text-slate-900 dark:text-slate-100"
            />

            {/* Options / Numeric Comparison */}
            {isNumeric ? (
              <div className="flex flex-wrap gap-6 pt-2">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Your Answer</div>
                  <div className="text-base font-mono font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {markedList[0] || '—'}
                  </div>
                </div>
                {hasKey && (
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Correct Answer</div>
                    <div className="text-base font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {correctList.join(' or ')}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {options.map((opt) => {
                  const prompt = String(opt.prompt);
                  const isCorrect = hasKey && correctList.includes(prompt);
                  const isMarked = markedList.includes(prompt);

                  let boxClass =
                    'bg-slate-50/75 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/[0.08]';
                  let badgeClass =
                    'bg-white dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border-slate-300/80 dark:border-white/15';
                  let rightLabel: string | null = null;

                  if (isCorrect) {
                    boxClass =
                      'bg-emerald-500/12 border-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.18)]';
                    badgeClass = 'bg-emerald-600 text-white border-emerald-500';
                    rightLabel = isMarked ? 'Correct · Your Answer' : 'Correct Answer';
                  } else if (isMarked && hasKey) {
                    boxClass =
                      'bg-rose-500/12 border-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.18)]';
                    badgeClass = 'bg-rose-600 text-white border-rose-500';
                    rightLabel = 'Your Answer';
                  } else if (isMarked) {
                    boxClass =
                      'bg-indigo-500/12 border-indigo-500 shadow-[0_0_16px_rgba(99,102,241,0.18)]';
                    badgeClass = 'bg-indigo-600 text-white border-indigo-500';
                    rightLabel = 'Selected';
                  }

                  return (
                    <div
                      key={prompt}
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border ${boxClass}`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold font-mono shrink-0 mt-0.5 border ${badgeClass}`}
                      >
                        {prompt}
                      </span>
                      <div className="flex-1 min-w-0 text-sm text-slate-900 dark:text-slate-100">
                        <MathHtml html={opt.value} fallbackText={prompt} />
                      </div>
                      {rightLabel && (
                        <span className="text-xs font-bold shrink-0 text-slate-700 dark:text-slate-200">
                          {rightLabel}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Collapsible Solution Explanation */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/75 dark:bg-[#0B0F19]/65 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpOpen((p) => !p)}
                aria-expanded={expOpen}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left text-xs font-extrabold text-indigo-600 dark:text-cyan-400"
              >
                <span>
                  {currentQ.solutionHtml
                    ? 'Explanation & Solution'
                    : hasKey
                    ? 'No Written Explanation'
                    : 'Solution & Answer Key Pending'}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${expOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {expOpen && (
                <div className="px-4 pb-4 pt-2.5 border-t border-slate-200/70 dark:border-white/[0.08]">
                  {currentQ.solutionHtml ? (
                    <MathHtml
                      html={currentQ.solutionHtml}
                      className="text-sm text-slate-800 dark:text-slate-200"
                    />
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {hasKey
                        ? 'No written explanation was provided for this question.'
                        : 'The official answer key and detailed explanation have not unlocked upstream yet.'}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Extra Verified Telemetry */}
            {(breadcrumb ||
              (currentQ.cohortAccuracy && currentQ.cohortAccuracy > 0) ||
              isSafeExternalUrl(currentQ.videoSolution)) && (
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {breadcrumb && <span>{breadcrumb}</span>}
                  {typeof currentQ.cohortAccuracy === 'number' &&
                    currentQ.cohortAccuracy > 0 && (
                      <span>
                        {formatNumber(currentQ.cohortAccuracy, 0)}% candidates answered correctly
                      </span>
                    )}
                </div>
                {isSafeExternalUrl(currentQ.videoSolution) && currentQ.videoSolution && (
                  <a
                    href={currentQ.videoSolution}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-cyan-400 hover:underline"
                  >
                    Watch Solution <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}
          </article>

          {/* Bottom Prev / Next Bar */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={cursor === 0}
              onClick={() => setCursor((c) => Math.max(0, c - 1))}
              className="h-10 px-4 rounded-xl glass-card text-xs font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-40 inline-flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button
              type="button"
              disabled={cursor >= filteredQuestions.length - 1}
              onClick={() =>
                setCursor((c) => Math.min(filteredQuestions.length - 1, c + 1))
              }
              className="h-10 px-5 rounded-xl btn-gradient disabled:opacity-40 text-xs font-bold inline-flex items-center gap-1.5"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Solutions Palette Modal */}
      {paletteOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPaletteOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md rounded-3xl glass-card p-5 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Questions ({filteredQuestions.length})
              </h2>
              <button
                type="button"
                onClick={() => setPaletteOpen(false)}
                className="p-1 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2 overflow-y-auto py-1">
              {filteredQuestions.map((qItem, idx) => {
                const bg =
                  qItem.status === 'correct'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : qItem.status === 'incorrect'
                    ? 'bg-rose-600 text-white border-rose-500'
                    : qItem.status === 'partial'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : qItem.status === 'unscored'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-200 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/15';

                return (
                  <button
                    key={qItem.questionId}
                    type="button"
                    onClick={() => {
                      setCursor(idx);
                      setPaletteOpen(false);
                    }}
                    className={`h-10 rounded-xl border text-xs font-extrabold font-mono tabular-nums ${bg} ${
                      idx === cursor ? 'ring-2 ring-cyan-400' : ''
                    }`}
                  >
                    {qItem.qsNo || idx + 1}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
