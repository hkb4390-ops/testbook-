import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock,
  Grid3X3,
  Lock,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import { testsService } from '../services/testsService';
import { attemptsService, type UpstreamResponsePayload } from '../services/attemptsService';
import { ApiError } from '../services/testbookApi';
import { getLanguageLabel } from '../config/apiConfig';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import type { ExamPaper, ExamQuestion, SavedResponseEntry } from '../types/testbook';
import { MathHtml } from '../components/MathHtml';
import { IconBox } from '../components/MotionPrimitives';
import { formatClock, formatNumber } from '../utils/formatters';

interface FlatQuestion {
  question: ExamQuestion;
  sectionIndex: number;
  sectionId: string;
  sectionTitle: string;
  globalIndex: number;
  sectionLocalIndex: number;
  sectionQuestionCount: number;
}

interface TelemetryLogEntry {
  t: string;
  at: number;
  v: string;
  visit: number;
}

interface QuestionAnswerState {
  marked: string[];
  numericValue: string;
  isBookmarked: boolean;
  timeSpent: number;
  visitCount: number;
  changes: number;
  logs: TelemetryLogEntry[];
  lang: string;
  visitElapsed: number;
}

type PaletteStatus =
  | 'not-visited'
  | 'not-answered'
  | 'answered'
  | 'marked'
  | 'answered-marked';

function createInitialAnswer(lang: string): QuestionAnswerState {
  return {
    marked: [],
    numericValue: '',
    isBookmarked: false,
    timeSpent: 0,
    visitCount: 0,
    changes: 0,
    logs: [],
    lang,
    visitElapsed: 0,
  };
}

function getPaletteStatus(ans?: QuestionAnswerState): PaletteStatus {
  if (!ans || ans.visitCount === 0) return 'not-visited';
  const hasAns = ans.marked.length > 0;
  if (hasAns && ans.isBookmarked) return 'answered-marked';
  if (hasAns) return 'answered';
  if (ans.isBookmarked) return 'marked';
  return 'not-answered';
}

function buildVisitsPayload(ans: QuestionAnswerState, nextQid: string) {
  const visitCount = Math.max(1, ans.visitCount || 1);
  if (visitCount === 1) {
    return [
      {
        time: Math.round(ans.timeSpent || 0),
        attempts: ans.marked.length > 0 ? 1 : 0,
        nextqid: nextQid,
        logs: ans.logs.map((l) => ({ t: l.t, at: l.at, v: l.v })),
      },
    ];
  }
  const perVisit: Array<Array<{ t: string; at: number; v: string }>> = Array.from(
    { length: visitCount },
    () => []
  );
  for (const log of ans.logs) {
    const idx = Math.min(visitCount - 1, Math.max(0, Number(log.visit) || 0));
    perVisit[idx].push({ t: log.t, at: log.at, v: log.v });
  }
  const perVisitTime = Math.round((ans.timeSpent || 0) / visitCount);
  return perVisit.map((slice, v) => ({
    time:
      v === visitCount - 1
        ? Math.round((ans.timeSpent || 0) - perVisitTime * (visitCount - 1))
        : perVisitTime,
    attempts: slice.some((l) => l.t === 'mo') ? 1 : 0,
    nextqid: nextQid,
    logs: slice,
  }));
}

export function ExamEnginePage() {
  const { testId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const seriesSlug = searchParams.get('slug') || '';
  const initialLang = searchParams.get('lang') || 'en';
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { autosaveEnabled } = usePreferences();

  const [paper, setPaper] = useState<ExamPaper | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [lang, setLang] = useState<string>(initialLang);
  const [cursor, setCursor] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuestionAnswerState>>({});

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ message: string; locked?: boolean } | null>(
    null
  );
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const lastVisitedQidRef = useRef<string | null>(null);
  const submittingRef = useRef(false);
  const answersRef = useRef(answers);
  const timeLeftRef = useRef(timeLeft);
  const cursorRef = useRef(cursor);

  answersRef.current = answers;
  timeLeftRef.current = timeLeft;
  cursorRef.current = cursor;

  const flatQuestions: FlatQuestion[] = useMemo(() => {
    if (!paper) return [];
    const list: FlatQuestion[] = [];
    (paper.sections || []).forEach((sec, si) => {
      const qs = sec.questions || [];
      qs.forEach((q, qi) => {
        list.push({
          question: q,
          sectionIndex: si,
          sectionId: sec.id,
          sectionTitle: sec.title || `Section ${si + 1}`,
          globalIndex: list.length,
          sectionLocalIndex: qi + 1,
          sectionQuestionCount: qs.length,
        });
      });
    });
    return list;
  }, [paper]);

  const flatRef = useRef(flatQuestions);
  flatRef.current = flatQuestions;

  const startTest = useCallback(async () => {
    if (!testId || !seriesSlug) {
      setLoadError({ message: 'Missing test ID or series slug.' });
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);

    try {
      const res = await testsService.startTestAttempt(testId, {
        seriesSlug,
        engine: 'tb',
        language: initialLang,
      });

      if (!res || !res.paper) {
        throw new Error('Could not start test paper.');
      }

      setPaper(res.paper);
      setAttemptId(res.attempt?.attemptId || null);
      setTimeLeft(
        res.attempt?.timeLeft ?? (res.paper.durationMinutes || 30) * 60
      );

      const availableCodes = res.paper.languageCodes?.length
        ? res.paper.languageCodes
        : ['en'];
      const chosenLang = availableCodes.includes(initialLang)
        ? initialLang
        : availableCodes.includes('en')
        ? 'en'
        : availableCodes[0];
      setLang(chosenLang);

      // Restore savedResponses if resuming
      const restored: Record<string, QuestionAnswerState> = {};
      const saved = res.savedResponses || {};
      for (const [qid, rawResp] of Object.entries(saved)) {
        const resp = (rawResp || {}) as SavedResponseEntry;
        const rawMarked = resp.markedOption;
        const marked =
          rawMarked === null || rawMarked === undefined
            ? []
            : Array.isArray(rawMarked)
            ? rawMarked.map(String)
            : String(rawMarked)
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);

        const visits = Array.isArray(resp.visits) ? resp.visits : [];
        const logs: TelemetryLogEntry[] = [];
        visits.forEach((v, vi) => {
          (Array.isArray(v.logs) ? v.logs : []).forEach((log) => {
            logs.push({
              t: log.t,
              at: Number(log.at) || 0,
              v: String(log.v ?? ''),
              visit: vi,
            });
          });
        });

        restored[qid] = {
          marked,
          numericValue: marked.length === 1 ? marked[0] : '',
          isBookmarked: resp.isBookmarked === true,
          timeSpent: Number(resp.time) || 0,
          visitCount: visits.length,
          changes: Math.max(0, logs.filter((l) => l.t === 'mo').length - 1),
          logs,
          lang: resp.lang || chosenLang,
          visitElapsed: 0,
        };
      }

      lastVisitedQidRef.current = null;
      setAnswers(restored);
      setCursor(0);
    } catch (err) {
      if (err instanceof ApiError && err.locked) {
        setLoadError({
          message: err.message || 'This test requires an active PRO plan upstream.',
          locked: true,
        });
      } else {
        setLoadError({
          message: err instanceof Error ? err.message : 'Could not load exam paper.',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [testId, seriesSlug, initialLang]);

  useEffect(() => {
    startTest();
  }, [startTest]);

  // Track question visit count only when landing on a new question
  const currentFlat = flatQuestions[cursor];
  useEffect(() => {
    if (!currentFlat) return;
    const qid = currentFlat.question.id;
    if (lastVisitedQidRef.current === qid) return;
    lastVisitedQidRef.current = qid;

    setAnswers((prev) => {
      const existing = prev[qid] || createInitialAnswer(lang);
      return {
        ...prev,
        [qid]: {
          ...existing,
          visitCount: (existing.visitCount || 0) + 1,
          visitElapsed: 0,
        },
      };
    });
  }, [currentFlat, lang]);

  const buildUpstreamResponses = useCallback((): Record<string, UpstreamResponsePayload> => {
    const out: Record<string, UpstreamResponsePayload> = {};
    const list = flatRef.current;
    const currentAnswers = answersRef.current;

    list.forEach((f, idx) => {
      const ans = currentAnswers[f.question.id];
      if (!ans) return;
      const touched =
        ans.marked.length > 0 || ans.isBookmarked || (ans.timeSpent || 0) > 0;
      if (!touched) return;

      const nextQid = (list[Math.min(idx + 1, list.length - 1)] || f).question.id;
      out[f.question.id] = {
        markedOption: ans.marked.length > 0 ? ans.marked.join(',') : null,
        isBookmarked: ans.isBookmarked,
        time: Math.round(ans.timeSpent || 0),
        lang: ans.lang || lang,
        visits: buildVisitsPayload(ans, nextQid),
      };
    });
    return out;
  }, [lang]);

  const currentQuestionToken = useCallback((): string => {
    const f = flatRef.current[cursorRef.current];
    if (!f) return 's~1~q~1';
    return `s~${f.sectionIndex + 1}~q~${f.sectionLocalIndex}`;
  }, []);

  const handleSubmitExam = useCallback(
    async (_autoSubmitted = false) => {
      if (submittingRef.current || !attemptId || !paper) return;
      submittingRef.current = true;
      setSubmitting(true);
      setSubmitError(null);
      setSubmitModalOpen(false);

      try {
        const result = await attemptsService.submitAttempt(attemptId, {
          testId: paper.testId || testId,
          seriesSlug: paper.seriesSlug || seriesSlug,
          engine: paper.engine || 'tb',
          currentQuestion: currentQuestionToken(),
          responses: buildUpstreamResponses(),
        });

        const finalAttemptId = result.attemptId || attemptId;
        navigate(`/results/${encodeURIComponent(finalAttemptId)}`, {
          replace: true,
          state: {
            resultData: {
              ...result,
              attempt: result.attempt || {
                attemptId: finalAttemptId,
                testId: paper.testId || testId,
                testTitle: paper.title,
                seriesSlug: paper.seriesSlug || seriesSlug,
              },
            },
          },
        });
      } catch (err) {
        submittingRef.current = false;
        setSubmitting(false);
        setSubmitError(
          err instanceof Error
            ? `Submission failed: ${err.message}`
            : 'Submission failed. Your responses are still preserved — please retry.'
        );
        setSubmitModalOpen(true);
      }
    },
    [attemptId, paper, testId, seriesSlug, currentQuestionToken, buildUpstreamResponses, navigate]
  );

  // Countdown timer + per-question timeSpent attribution
  useEffect(() => {
    if (!paper || loading || loadError || submitting) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitExam(true);
          return 0;
        }
        return prev - 1;
      });

      const curr = flatRef.current[cursorRef.current];
      if (curr) {
        const qid = curr.question.id;
        setAnswers((prev) => {
          const a = prev[qid] || createInitialAnswer(lang);
          return {
            ...prev,
            [qid]: {
              ...a,
              timeSpent: (a.timeSpent || 0) + 1,
              visitElapsed: (a.visitElapsed || 0) + 1,
            },
          };
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [paper, loading, loadError, submitting, lang, handleSubmitExam]);

  // Periodic Autosave every 15 seconds
  useEffect(() => {
    if (!attemptId || !paper || !autosaveEnabled || loading || loadError) return;
    const interval = setInterval(() => {
      attemptsService
        .saveProgress(attemptId, {
          testId: paper.testId || testId,
          engine: paper.engine || 'tb',
          currentQuestion: currentQuestionToken(),
          timeLeft: timeLeftRef.current,
          responses: buildUpstreamResponses(),
        })
        .catch(() => {
          // Autosave failures are non-fatal; next tick retries
        });
    }, 15_000);
    return () => clearInterval(interval);
  }, [
    attemptId,
    paper,
    autosaveEnabled,
    loading,
    loadError,
    testId,
    currentQuestionToken,
    buildUpstreamResponses,
  ]);

  const handleOptionTap = (prompt: string) => {
    if (!currentFlat) return;
    const q = currentFlat.question;
    const isMulti = q.type === 'multi_select' || q.type === 'msq';

    setAnswers((prev) => {
      const a = prev[q.id] || createInitialAnswer(lang);
      const had = a.marked.length > 0;
      let nextMarked: string[];
      let nextChanges = a.changes || 0;

      if (isMulti) {
        nextMarked = a.marked.includes(prompt)
          ? a.marked.filter((p) => p !== prompt)
          : [...a.marked, prompt].sort();
      } else {
        if (had && a.marked[0] === prompt) {
          nextMarked = [];
        } else {
          if (had) nextChanges += 1;
          nextMarked = [prompt];
        }
      }

      const nextLogs: TelemetryLogEntry[] = [
        ...a.logs,
        {
          t: 'mo',
          at: a.visitElapsed || 0,
          v: nextMarked.join(','),
          visit: Math.max(0, (a.visitCount || 1) - 1),
        },
      ];

      return {
        ...prev,
        [q.id]: {
          ...a,
          marked: nextMarked,
          changes: nextChanges,
          lang,
          logs: nextLogs,
        },
      };
    });
  };

  const handleNumericChange = (rawVal: string) => {
    if (!currentFlat) return;
    const qid = currentFlat.question.id;
    const cleaned = rawVal.replace(/[^0-9.\-]/g, '');

    setAnswers((prev) => {
      const a = prev[qid] || createInitialAnswer(lang);
      return {
        ...prev,
        [qid]: {
          ...a,
          numericValue: cleaned,
          marked: cleaned ? [cleaned] : [],
          lang,
          logs: [
            ...a.logs,
            {
              t: 'mo',
              at: a.visitElapsed || 0,
              v: cleaned,
              visit: Math.max(0, (a.visitCount || 1) - 1),
            },
          ],
        },
      };
    });
  };

  const handleClear = () => {
    if (!currentFlat) return;
    const qid = currentFlat.question.id;
    setAnswers((prev) => {
      const a = prev[qid] || createInitialAnswer(lang);
      return {
        ...prev,
        [qid]: {
          ...a,
          marked: [],
          numericValue: '',
          logs: [
            ...a.logs,
            {
              t: 'mo',
              at: a.visitElapsed || 0,
              v: '',
              visit: Math.max(0, (a.visitCount || 1) - 1),
            },
          ],
        },
      };
    });
  };

  const handleToggleBookmark = () => {
    if (!currentFlat) return;
    const qid = currentFlat.question.id;
    setAnswers((prev) => {
      const a = prev[qid] || createInitialAnswer(lang);
      const nextBookmarked = !a.isBookmarked;
      const nextLogs = nextBookmarked
        ? [
            ...a.logs,
            {
              t: 'b',
              at: a.visitElapsed || 0,
              v: 'bfsn',
              visit: Math.max(0, (a.visitCount || 1) - 1),
            },
          ]
        : a.logs;

      return {
        ...prev,
        [qid]: {
          ...a,
          isBookmarked: nextBookmarked,
          logs: nextLogs,
        },
      };
    });
  };

  const summaryCounts = useMemo(() => {
    const counts = {
      answered: 0,
      'not-answered': 0,
      marked: 0,
      'answered-marked': 0,
      'not-visited': 0,
    };
    for (const f of flatQuestions) {
      counts[getPaletteStatus(answers[f.question.id])] += 1;
    }
    return counts;
  }, [flatQuestions, answers]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center app-ambient-bg text-slate-900 dark:text-slate-100 p-6">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-cyan-500 border-r-indigo-500 animate-spin shadow-[0_0_24px_rgba(99,102,241,0.35)]" />
        <p className="mt-4 text-sm font-semibold text-indigo-600 dark:text-cyan-400">
          Preparing your exam paper...
        </p>
      </div>
    );
  }

  if (loadError || !paper || !currentFlat) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center app-ambient-bg p-6">
        <div className="max-w-md w-full rounded-3xl glass-card p-6 text-center space-y-4">
          {loadError?.locked && (
            <div className="flex justify-center">
              <IconBox tone="amber" size="lg">
                <Lock className="w-6 h-6" />
              </IconBox>
            </div>
          )}
          <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">
            {loadError?.locked ? 'Restricted Test Access' : 'Could Not Start Test'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {loadError?.message || 'Test questions could not be loaded.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/15 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Go Back
            </button>
            {!loadError?.locked && (
              <button
                type="button"
                onClick={startTest}
                className="px-5 py-2 rounded-xl btn-gradient text-sm font-bold"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const q = currentFlat.question;
  const block =
    (q.byLang && (q.byLang[lang] || (q.defaultLang ? q.byLang[q.defaultLang] : undefined))) ||
    (q.byLang ? Object.values(q.byLang)[0] : undefined) ||
    {};
  const currentAnswer = answers[q.id] || createInitialAnswer(lang);
  const isNumeric = q.isNum === true || q.type === 'numeric';
  const isMulti = q.type === 'multi_select' || q.type === 'msq';
  const availableLangs = paper.languageCodes?.length ? paper.languageCodes : ['en'];
  const activeSectionFlat = flatQuestions.filter(
    (f) => f.sectionIndex === currentFlat.sectionIndex
  );
  const progressPct =
    flatQuestions.length > 0
      ? Math.min(100, Math.round(((cursor + 1) / flatQuestions.length) * 100))
      : 0;

  const paletteColorClass = (status: PaletteStatus) => {
    switch (status) {
      case 'answered':
        return 'bg-emerald-600 text-white border-emerald-500 shadow-[0_4px_12px_-4px_rgba(16,185,129,0.5)]';
      case 'not-answered':
        return 'bg-rose-600 text-white border-rose-500 shadow-[0_4px_12px_-4px_rgba(244,63,94,0.45)]';
      case 'marked':
        return 'bg-violet-600 text-white border-violet-500 shadow-[0_4px_12px_-4px_rgba(139,92,246,0.45)]';
      case 'answered-marked':
        return 'bg-indigo-600 text-white border-indigo-400 shadow-[0_4px_12px_-4px_rgba(99,102,241,0.5)]';
      default:
        return 'bg-slate-100/90 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10';
    }
  };

  return (
    <div className="h-screen flex flex-col app-ambient-bg text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Top Distraction-Free Exam Header */}
      <header className="h-14 px-3 sm:px-5 bg-white/85 dark:bg-[#0B0F19]/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setSubmitModalOpen(true)}
            aria-label="Exit or submit exam"
            className="p-2 rounded-xl bg-slate-100/80 dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/10 hover:border-rose-400/50 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-extrabold truncate text-slate-900 dark:text-white">
              {paper.title}
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {currentFlat.sectionTitle} · Q {currentFlat.sectionLocalIndex} of{' '}
              {currentFlat.sectionQuestionCount}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label="Exam language"
            className="h-8 px-2.5 rounded-xl border border-slate-300/80 dark:border-white/15 bg-white/80 dark:bg-[#0B0F19]/80 text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            {availableLangs.map((code) => (
              <option key={code} value={code}>
                {getLanguageLabel(code)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="h-8 w-8 rounded-xl border border-slate-200 dark:border-white/15 bg-white/70 dark:bg-white/[0.06] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-indigo-400 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          <div
            className={`h-8 px-3 rounded-xl border flex items-center gap-1.5 font-mono tabular-nums text-xs font-extrabold ${
              timeLeft <= 300
                ? 'bg-rose-500/15 border-rose-400/45 text-rose-600 dark:text-rose-400 shadow-[0_0_16px_rgba(244,63,94,0.2)]'
                : 'bg-indigo-500/12 border-indigo-400/35 text-indigo-700 dark:text-cyan-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {formatClock(timeLeft)}
          </div>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Open question palette"
            className="lg:hidden h-8 w-8 rounded-xl border border-slate-200 dark:border-white/15 bg-white/70 dark:bg-white/[0.06] flex items-center justify-center text-slate-700 dark:text-slate-200"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Section Tabs */}
      <div className="px-3 sm:px-5 py-2 bg-white/60 dark:bg-[#0B0F19]/60 backdrop-blur-md border-b border-slate-200/80 dark:border-white/[0.06] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        {paper.sections.map((sec, si) => {
          const active = si === currentFlat.sectionIndex;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => {
                const target = flatQuestions.find((f) => f.sectionIndex === si);
                if (target) setCursor(target.globalIndex);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all ${
                active
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                  : 'bg-white/80 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10'
              }`}
            >
              <span>{sec.title || `Section ${si + 1}`}</span>
              <span className="opacity-80 font-mono tabular-nums">
                ({sec.questions?.length || 0}
                {sec.timeLimit > 0 ? ` · ${sec.timeLimit}m` : ''})
              </span>
            </button>
          );
        })}
      </div>

      {/* Linear Gradient Progress Bar */}
      <div className="w-full h-1 bg-slate-200/70 dark:bg-white/[0.06] shrink-0">
        <div
          className="h-full progress-gradient transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Main Split Body: Question Stage (left) + Desktop Palette Sidebar (right) */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Question Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl mx-auto space-y-4"
          >
            {block.comprehension && (
              <div className="rounded-2xl glass-card p-4 max-h-56 overflow-y-auto">
                <div className="text-xs font-bold text-indigo-600 dark:text-cyan-400 mb-2">
                  Comprehension Passage
                </div>
                <MathHtml
                  html={block.comprehension}
                  className="text-sm text-slate-700 dark:text-slate-300"
                />
              </div>
            )}

            <div className="rounded-2xl glass-card p-5 sm:p-6">
              {/* Question Metadata Line (no pill sandwiches) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-200/70 dark:border-white/[0.08] text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-extrabold font-mono tabular-nums text-indigo-600 dark:text-cyan-400">
                    Question {currentFlat.sectionLocalIndex}
                  </span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                    |
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {isNumeric
                      ? 'Numeric Answer'
                      : isMulti
                      ? 'Multiple Select'
                      : 'Single Choice'}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono tabular-nums font-bold">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    +{formatNumber(q.posMarks)}
                  </span>
                  {Number(q.negMarks) > 0 && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700">/</span>
                      <span className="text-rose-600 dark:text-rose-400">
                        -{formatNumber(q.negMarks)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Question Text & Images */}
              <MathHtml
                html={block.text}
                fallbackText="Question text is unavailable in this language."
                className="text-sm sm:text-base text-slate-900 dark:text-slate-100"
              />

              {/* Options or Numeric Input */}
              {isNumeric ? (
                <div className="mt-5">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Enter Numeric Response
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={currentAnswer.numericValue}
                    onChange={(e) => handleNumericChange(e.target.value)}
                    placeholder="Type number..."
                    className="w-full sm:w-64 h-11 px-4 rounded-xl border border-slate-300/80 dark:border-white/15 bg-white/80 dark:bg-[#0B0F19]/80 font-mono text-base text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <div className="mt-5 space-y-2.5">
                  {(block.options || []).map((opt) => {
                    const selected = currentAnswer.marked.includes(opt.prompt);
                    return (
                      <button
                        key={opt.prompt}
                        type="button"
                        onClick={() => handleOptionTap(opt.prompt)}
                        className={`w-full text-left flex items-start gap-3 p-3.5 rounded-2xl border transition-all active:scale-[0.99] ${
                          selected
                            ? 'bg-indigo-500/12 dark:bg-indigo-500/18 border-indigo-500 shadow-[0_0_18px_rgba(99,102,241,0.22)]'
                            : 'bg-slate-50/80 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-400/50'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold font-mono shrink-0 mt-0.5 border transition-colors ${
                            selected
                              ? 'bg-gradient-to-br from-indigo-500 to-cyan-500 text-white border-transparent shadow-sm'
                              : 'bg-white dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border-slate-300/80 dark:border-white/15'
                          }`}
                        >
                          {opt.prompt}
                        </span>
                        <div className="flex-1 min-w-0 text-sm text-slate-900 dark:text-slate-100">
                          <MathHtml html={opt.value} fallbackText={opt.prompt} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Desktop Question Palette Sidebar */}
        <aside className="hidden lg:flex w-80 flex-col border-l border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-xl p-4 shrink-0 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Question Palette
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {currentFlat.sectionQuestionCount} Qs
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-4 pb-4 border-b border-slate-200/70 dark:border-white/[0.08] tabular-nums">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Answered</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {summaryCounts.answered + summaryCounts['answered-marked']}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Not Answered</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                {summaryCounts['not-answered']}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Marked</span>
              <span className="font-mono font-bold text-violet-600 dark:text-violet-400">
                {summaryCounts.marked + summaryCounts['answered-marked']}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Not Visited</span>
              <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                {summaryCounts['not-visited']}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {activeSectionFlat.map((f) => {
              const status = getPaletteStatus(answers[f.question.id]);
              const isCurr = f.globalIndex === cursor;
              return (
                <button
                  key={f.question.id}
                  type="button"
                  onClick={() => setCursor(f.globalIndex)}
                  className={`h-10 rounded-xl border text-xs font-extrabold font-mono tabular-nums transition-all active:scale-95 ${paletteColorClass(
                    status
                  )} ${isCurr ? 'ring-2 ring-cyan-400 ring-offset-2 dark:ring-offset-[#0B0F19]' : ''}`}
                >
                  {f.sectionLocalIndex}
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200/70 dark:border-white/[0.08] space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-600 inline-block" /> Answered
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-rose-600 inline-block" /> Not Answered
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-violet-600 inline-block" /> Marked for Review
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-indigo-600 inline-block" /> Answered &amp; Marked
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-slate-200 dark:bg-white/10 inline-block" /> Not Visited
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Action Bar */}
      <footer className="px-3 sm:px-5 py-2.5 bg-white/85 dark:bg-[#0B0F19]/85 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/[0.08] flex items-center gap-2 shrink-0">
        <button
          type="button"
          disabled={cursor === 0}
          onClick={() => setCursor((c) => Math.max(0, c - 1))}
          className="h-10 px-3 rounded-xl border border-slate-200 dark:border-white/15 bg-white/70 dark:bg-white/[0.04] text-xs font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-40 inline-flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <button
          type="button"
          onClick={handleClear}
          className="h-10 px-3 rounded-xl border border-slate-200 dark:border-white/15 bg-white/70 dark:bg-white/[0.04] text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
        >
          Clear
        </button>

        <button
          type="button"
          onClick={handleToggleBookmark}
          className={`h-10 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
            currentAnswer.isBookmarked
              ? 'bg-violet-600 text-white border-violet-500 shadow-[0_4px_14px_rgba(139,92,246,0.4)]'
              : 'border-violet-300/70 dark:border-violet-500/35 text-violet-700 dark:text-violet-300 bg-violet-500/10'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {currentAnswer.isBookmarked ? 'Marked' : 'Review'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (cursor < flatQuestions.length - 1) {
              setCursor((c) => c + 1);
            } else {
              setSubmitModalOpen(true);
            }
          }}
          className="flex-1 h-10 px-4 rounded-xl btn-gradient text-xs font-bold inline-flex items-center justify-center gap-1"
        >
          <span>{cursor < flatQuestions.length - 1 ? 'Save & Next' : 'Finish'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setSubmitModalOpen(true)}
          className="h-10 px-4 rounded-xl btn-gradient-rose text-xs font-bold"
        >
          Submit
        </button>
      </footer>

      {/* Mobile Palette Drawer */}
      {paletteOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-end"
          onClick={() => setPaletteOpen(false)}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="glass-card rounded-t-3xl p-5 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {currentFlat.sectionTitle} ({currentFlat.sectionQuestionCount} Qs)
              </h2>
              <button
                type="button"
                onClick={() => setPaletteOpen(false)}
                className="p-1.5 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2 overflow-y-auto py-1">
              {activeSectionFlat.map((f) => {
                const status = getPaletteStatus(answers[f.question.id]);
                const isCurr = f.globalIndex === cursor;
                return (
                  <button
                    key={f.question.id}
                    type="button"
                    onClick={() => {
                      setCursor(f.globalIndex);
                      setPaletteOpen(false);
                    }}
                    className={`h-10 rounded-xl border text-xs font-extrabold font-mono tabular-nums ${paletteColorClass(
                      status
                    )} ${isCurr ? 'ring-2 ring-cyan-400' : ''}`}
                  >
                    {f.sectionLocalIndex}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {submitModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !submitting && setSubmitModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md rounded-3xl glass-card p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Submit Exam?
            </h2>

            <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08]">
                <div className="text-slate-500 dark:text-slate-400">Answered</div>
                <div className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {summaryCounts.answered + summaryCounts['answered-marked']} / {flatQuestions.length}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08]">
                <div className="text-slate-500 dark:text-slate-400">Not Answered</div>
                <div className="text-base font-extrabold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                  {summaryCounts['not-answered']}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08]">
                <div className="text-slate-500 dark:text-slate-400">Marked for Review</div>
                <div className="text-base font-extrabold font-mono text-violet-600 dark:text-violet-400 mt-0.5">
                  {summaryCounts.marked + summaryCounts['answered-marked']}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08]">
                <div className="text-slate-500 dark:text-slate-400">Not Visited</div>
                <div className="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
                  {summaryCounts['not-visited']}
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Time Remaining: {formatClock(timeLeft)}
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-400/40 text-xs text-rose-600 dark:text-rose-300">
                {submitError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setSubmitModalOpen(false)}
                className="flex-1 h-10 rounded-xl border border-slate-300 dark:border-white/15 text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmitExam(false)}
                className="flex-1 h-10 rounded-xl btn-gradient-rose disabled:opacity-50 text-sm font-bold"
              >
                {submitting ? 'Submitting...' : 'Confirm Submit'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
