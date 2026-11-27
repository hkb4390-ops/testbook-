import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

export type IconTone =
  | 'indigo'
  | 'cyan'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'gold';

const TONE_CLASSES: Record<IconTone, string> = {
  indigo:
    'bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border-indigo-400/35 text-indigo-600 dark:text-indigo-300 shadow-[0_6px_18px_-6px_rgba(99,102,241,0.35)]',
  cyan:
    'bg-gradient-to-br from-cyan-500/20 to-sky-500/20 border-cyan-400/35 text-cyan-600 dark:text-cyan-300 shadow-[0_6px_18px_-6px_rgba(6,182,212,0.35)]',
  emerald:
    'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-400/35 text-emerald-600 dark:text-emerald-300 shadow-[0_6px_18px_-6px_rgba(16,185,129,0.35)]',
  amber:
    'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-400/35 text-amber-600 dark:text-amber-300 shadow-[0_6px_18px_-6px_rgba(245,158,11,0.35)]',
  rose:
    'bg-gradient-to-br from-rose-500/20 to-pink-500/20 border-rose-400/35 text-rose-600 dark:text-rose-300 shadow-[0_6px_18px_-6px_rgba(244,63,94,0.35)]',
  violet:
    'bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border-violet-400/35 text-violet-600 dark:text-violet-300 shadow-[0_6px_18px_-6px_rgba(139,92,246,0.35)]',
  gold:
    'bg-gradient-to-br from-yellow-400/25 to-amber-500/25 border-amber-400/45 text-amber-600 dark:text-yellow-300 shadow-[0_6px_20px_-6px_rgba(245,158,11,0.45)]',
};

export function IconBox({
  children,
  tone = 'indigo',
  size = 'md',
  className = '',
}: {
  children: React.ReactNode;
  tone?: IconTone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClass =
    size === 'sm'
      ? 'w-9 h-9 rounded-xl'
      : size === 'lg'
      ? 'w-12 h-12 rounded-2xl'
      : 'w-11 h-11 rounded-xl';

  return (
    <div
      className={`${sizeClass} border flex items-center justify-center shrink-0 ${TONE_CLASSES[tone]} ${className}`}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  durationMs = 650,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
}) {
  const safeTarget = Number.isFinite(value) ? value : 0;
  const [display, setDisplay] = useState(safeTarget);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setDisplay(safeTarget);
      return;
    }

    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(safeTarget * eased);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setDisplay(safeTarget);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [safeTarget, durationMs]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : Math.round(display).toLocaleString('en-IN');

  return (
    <span className="tabular-nums">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export function MotionSection({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionCard({
  children,
  index = 0,
  className = '',
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
}) {
  const cappedDelay = Math.min(index, 8) * 0.035;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: cappedDelay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
