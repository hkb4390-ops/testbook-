import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ExternalLink, Send, Sparkles, X } from 'lucide-react';

const TELEGRAM_CHANNEL_URL = 'https://t.me/hrbseb10thallcorse';
const WAIT_DURATION_MS = 4000;

export function TelegramWelcomeModal() {
  const [open, setOpen] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!open) return;
    const start = performance.now();
    const timer = window.setInterval(() => {
      const next = Math.min(WAIT_DURATION_MS, performance.now() - start);
      setElapsedMs(next);
      if (next >= WAIT_DURATION_MS) {
        window.clearInterval(timer);
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [open]);

  const canClose = elapsedMs >= WAIT_DURATION_MS;
  const remainingSec = Math.max(0, Math.ceil((WAIT_DURATION_MS - elapsedMs) / 1000));
  const progressPct = Math.min(100, (elapsedMs / WAIT_DURATION_MS) * 100);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="telegram-welcome-title"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 14 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md rounded-3xl glass-card p-6 sm:p-7 overflow-hidden text-center"
          >
            {/* Ambient corner glow */}
            <div
              className="pointer-events-none absolute -top-20 -right-20 w-52 h-52 rounded-full bg-gradient-to-br from-indigo-500/25 via-violet-500/20 to-cyan-500/25 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-20 -left-20 w-52 h-52 rounded-full bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 blur-3xl"
              aria-hidden="true"
            />

            {/* Top-right Cut / Countdown */}
            <div className="absolute top-4 right-4 z-10">
              {canClose ? (
                <motion.button
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close welcome dialog"
                  className="w-9 h-9 rounded-xl bg-slate-100/90 dark:bg-white/10 border border-slate-200 dark:border-white/15 flex items-center justify-center text-slate-700 dark:text-white hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-colors shadow-sm"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              ) : (
                <div className="h-8 px-3 rounded-xl bg-indigo-500/12 border border-indigo-400/30 text-indigo-600 dark:text-cyan-300 text-xs font-extrabold font-mono tabular-nums flex items-center justify-center">
                  {remainingSec}s
                </div>
              )}
            </div>

            {/* Animated Telegram Icon */}
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center mb-4">
              <motion.div
                animate={
                  canClose
                    ? { scale: 1, opacity: 0.25 }
                    : { scale: [1, 1.28, 1], opacity: [0.45, 0.1, 0.45] }
                }
                transition={{ duration: 1.6, repeat: canClose ? 0 : Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500 to-cyan-500 blur-md"
                aria-hidden="true"
              />
              <motion.div
                animate={canClose ? { y: 0 } : { y: [0, -4, 0] }}
                transition={{ duration: 1.5, repeat: canClose ? 0 : Infinity, ease: 'easeInOut' }}
                className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-500 flex items-center justify-center text-white shadow-[0_12px_30px_-6px_rgba(99,102,241,0.65)] border border-white/25"
              >
                <Send className="w-7 h-7 -ml-0.5" />
              </motion.div>
            </div>

            <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official Study Updates</span>
            </div>

            <h2
              id="telegram-welcome-title"
              className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white"
            >
              Join Our Telegram Channel
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Get daily mock test alerts, new test series updates, and exam study notes directly on Telegram.
            </p>
            <div className="mt-1.5 text-xs font-mono font-bold text-indigo-600 dark:text-cyan-400">
              @hrbseb10thallcorse
            </div>

            {/* 4-Second Progress Bar */}
            <div className="mt-5 space-y-1.5">
              <div className="w-full h-2 rounded-full bg-slate-200/80 dark:bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full progress-gradient transition-[width] duration-75"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                {canClose
                  ? 'Ready — you can now close or continue to the app.'
                  : `Preparing workspace... Close option unlocks in ${remainingSec}s`}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 space-y-2.5">
              <a
                href={TELEGRAM_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 rounded-xl btn-gradient text-sm font-extrabold inline-flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Join Telegram Channel
                <ExternalLink className="w-3.5 h-3.5 opacity-85" />
              </a>

              {canClose && (
                <motion.button
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/15 bg-white/75 dark:bg-white/[0.05] text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-indigo-400 transition-colors"
                >
                  Continue to App
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
