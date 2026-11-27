import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, FileText, Play, ShieldAlert } from 'lucide-react';
import { testsService } from '../services/testsService';
import { getLanguageLabel } from '../config/apiConfig';
import { usePreferences } from '../context/PreferencesContext';
import type { TestInstructions } from '../types/testbook';
import { ErrorBanner } from '../components/StateViews';
import { IconBox, MotionSection } from '../components/MotionPrimitives';
import { formatNumber } from '../utils/formatters';

export function InstructionsPage() {
  const { testId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const seriesSlug = searchParams.get('slug') || '';
  const navigate = useNavigate();
  const { defaultLanguage } = usePreferences();

  const [instructions, setInstructions] = useState<TestInstructions | null>(null);
  const [selectedLang, setSelectedLang] = useState(defaultLanguage || 'en');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInstructions = async () => {
    if (!testId || !seriesSlug) {
      setError('Both test ID and series slug are required to load test instructions.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await testsService.getTestInstructions(testId, seriesSlug);
      setInstructions(data);
      const codes = data.languageCodes?.length ? data.languageCodes : ['en'];
      if (codes.includes(defaultLanguage)) {
        setSelectedLang(defaultLanguage);
      } else if (codes.includes('en')) {
        setSelectedLang('en');
      } else {
        setSelectedLang(codes[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test instructions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstructions();
  }, [testId, seriesSlug]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 w-40 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
        <div className="h-64 rounded-3xl glass-card" />
      </div>
    );
  }

  if (error || !instructions) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-400"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <ErrorBanner
          title="Instructions Unavailable"
          message={error || 'Unable to fetch instructions for this test.'}
          onRetry={loadInstructions}
        />
      </div>
    );
  }

  const codes = instructions.languageCodes?.length ? instructions.languageCodes : ['en'];
  const marksList = (instructions.marksPerQuestion || []).map((m) => `+${formatNumber(m)}`).join(', ') || '+1';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {instructions.seriesSlug}
        </span>
      </div>

      <MotionSection>
        <section className="rounded-3xl glass-card p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              {instructions.title}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Read the marking scheme and section breakdown carefully before starting.
            </p>
          </div>

          {/* Key Facts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-slate-50/80 dark:bg-[#0B0F19]/75 border border-slate-200/80 dark:border-white/[0.07] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Duration</span>
                <IconBox tone="indigo" size="sm">
                  <Clock className="w-4 h-4" />
                </IconBox>
              </div>
              <div className="text-lg font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
                {instructions.durationMinutes} min
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50/80 dark:bg-[#0B0F19]/75 border border-slate-200/80 dark:border-white/[0.07] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Questions</span>
                <IconBox tone="cyan" size="sm">
                  <FileText className="w-4 h-4" />
                </IconBox>
              </div>
              <div className="text-lg font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
                {instructions.totalQuestions}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50/80 dark:bg-[#0B0F19]/75 border border-slate-200/80 dark:border-white/[0.07] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Total Marks</span>
                <IconBox tone="emerald" size="sm">
                  <CheckCircle2 className="w-4 h-4" />
                </IconBox>
              </div>
              <div className="text-lg font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
                {formatNumber(instructions.totalMarks)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50/80 dark:bg-[#0B0F19]/75 border border-slate-200/80 dark:border-white/[0.07] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Negative</span>
                <IconBox tone="rose" size="sm">
                  <ShieldAlert className="w-4 h-4" />
                </IconBox>
              </div>
              <div className="text-lg font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
                {instructions.hasNegativeMarking
                  ? `-${formatNumber(instructions.maxNegativeMarks)}`
                  : 'None'}
              </div>
            </div>
          </div>

          {/* Marking Scheme */}
          <div className="pt-4 border-t border-slate-200/70 dark:border-white/[0.08] space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Marking Scheme</h2>
            <ul className="space-y-1.5 list-disc pl-5">
              <li>
                Correct answer awards <strong className="text-slate-900 dark:text-white">{marksList}</strong> marks per question.
              </li>
              <li>
                Wrong answer penalty:{' '}
                <strong className="text-slate-900 dark:text-white">
                  {instructions.hasNegativeMarking
                    ? `-${formatNumber(instructions.maxNegativeMarks)} marks`
                    : 'No negative marking'}
                </strong>
                .
              </li>
              <li>Unattempted questions carry 0 marks.</li>
              <li>
                {instructions.hasSectionTimers
                  ? 'This exam enforces section-wise timers.'
                  : 'A single countdown timer covers the entire paper.'}
              </li>
            </ul>
          </div>

          {/* Sections Breakdown */}
          {instructions.sections && instructions.sections.length > 0 && (
            <div className="pt-4 border-t border-slate-200/70 dark:border-white/[0.08] space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Sections in this Test
              </h2>
              <div className="divide-y divide-slate-200/70 dark:divide-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl bg-slate-50/60 dark:bg-[#0B0F19]/60 overflow-hidden">
                {instructions.sections.map((sec, idx) => (
                  <div
                    key={sec.id}
                    className="px-4 py-3 flex items-center justify-between gap-4 text-sm"
                  >
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {sec.title || `Section ${idx + 1}`}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {sec.qCount} Qs{sec.timeLimit > 0 ? ` · ${sec.timeLimit}m` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Default Language Picker */}
          <div className="pt-4 border-t border-slate-200/70 dark:border-white/[0.08] space-y-2.5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Choose Default Exam Language
            </h2>
            <div className="flex flex-wrap gap-2">
              {codes.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelectedLang(code)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    selectedLang === code
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white border-transparent shadow-sm'
                      : 'bg-slate-50/80 dark:bg-[#0B0F19]/75 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-indigo-500'
                  }`}
                >
                  {getLanguageLabel(code)}
                </button>
              ))}
            </div>
          </div>

          {/* Agreement + Start */}
          <div className="pt-4 border-t border-slate-200/70 dark:border-white/[0.08] space-y-4">
            <label className="flex items-start gap-3 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                I have read and understood the instructions, marking scheme, and exam rules.
              </span>
            </label>

            <button
              type="button"
              disabled={!agreed}
              onClick={() =>
                navigate(
                  `/exam/${encodeURIComponent(testId)}/play?slug=${encodeURIComponent(
                    instructions.seriesSlug
                  )}&lang=${encodeURIComponent(selectedLang)}`
                )
              }
              className="w-full h-12 rounded-xl btn-gradient disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold inline-flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Test Now
            </button>
          </div>
        </section>
      </MotionSection>
    </div>
  );
}
