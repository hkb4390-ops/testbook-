import { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface SeriesIconProps {
  src?: string;
  alt: string;
  className?: string;
}

export function SeriesIcon({ src, alt, className = 'w-11 h-11' }: SeriesIconProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`${className} rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-400/35 flex items-center justify-center text-indigo-600 dark:text-cyan-300 shadow-[0_6px_16px_-6px_rgba(99,102,241,0.35)] shrink-0`}
        aria-hidden="true"
      >
        <BookOpen className="w-5 h-5" />
      </div>
    );
  }

  return (
    <div
      className={`${className} rounded-xl bg-white dark:bg-white/95 border border-slate-200/80 dark:border-white/20 p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-sm`}
    >
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setFailed(true)}
        className="w-full h-full object-contain"
      />
    </div>
  );
}
