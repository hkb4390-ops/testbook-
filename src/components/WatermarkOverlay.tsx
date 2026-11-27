const WATERMARK_TILES = Array.from({ length: 18 });

export function WatermarkOverlay() {
  return (
    <>
      {/* Subtle full-screen non-interactive diagonal watermark layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none fixed inset-0 z-[45] overflow-hidden"
      >
        <div className="w-[140vw] h-[140vh] -ml-[20vw] -mt-[20vh] grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-10 place-items-center -rotate-24 opacity-[0.045] dark:opacity-[0.06]">
          {WATERMARK_TILES.map((_, idx) => (
            <span
              key={idx}
              className="font-mono font-extrabold tracking-widest text-xs sm:text-sm uppercase text-slate-900 dark:text-white whitespace-nowrap"
            >
              hrrytestbookpro
            </span>
          ))}
        </div>
      </div>

      {/* Persistent corner brand watermark badge */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none fixed bottom-16 left-3 md:bottom-3 md:left-4 z-[60] px-2.5 py-1 rounded-lg bg-white/70 dark:bg-[#0B0F19]/75 backdrop-blur-md border border-slate-200/70 dark:border-white/10 shadow-sm"
      >
        <span className="font-mono text-[11px] font-extrabold tracking-wide bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-300 dark:to-cyan-300 bg-clip-text text-transparent">
          hrrytestbookpro
        </span>
      </div>
    </>
  );
}
