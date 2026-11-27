import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { IconBox } from './MotionPrimitives';

export function LoadingGrid({ count = 6, columns = 3 }: { count?: number; columns?: 2 | 3 | 4 }) {
  const gridCols =
    columns === 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : columns === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid ${gridCols} gap-4`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-2xl glass-card p-5 animate-pulse"
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/15 dark:bg-indigo-500/20 shrink-0" />
            <div className="flex-1 space-y-2.5">
              <div className="h-4 w-3/4 rounded-md bg-slate-200/90 dark:bg-slate-800/80" />
              <div className="h-3 w-1/2 rounded-md bg-slate-200/70 dark:bg-slate-800/60" />
            </div>
          </div>
          <div className="mt-4 h-3 w-2/3 rounded-md bg-slate-200/70 dark:bg-slate-800/60" />
        </div>
      ))}
    </div>
  );
}

export function ErrorBanner({
  title = 'Unable to load data',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rose-300/60 dark:border-rose-500/35 bg-rose-50/85 dark:bg-rose-950/35 backdrop-blur-md p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
      <div className="flex items-start gap-3.5">
        <IconBox tone="rose" size="sm">
          <AlertTriangle className="w-4 h-4" />
        </IconBox>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 hover:border-indigo-400 transition-colors shrink-0 self-start sm:self-center"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl glass-card p-10 text-center flex flex-col items-center">
      <IconBox tone="indigo" size="lg" className="mb-3.5">
        <Inbox className="w-6 h-6" />
      </IconBox>
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mt-1">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 px-5 py-2.5 rounded-xl text-sm font-bold btn-gradient"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
