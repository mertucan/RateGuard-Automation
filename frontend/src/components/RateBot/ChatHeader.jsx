import RateBotAvatar from "./RateBotAvatar";

export default function ChatHeader({ onClose }) {
  return (
    <div className="flex items-center justify-between border-b border-border/80 bg-gradient-to-r from-primary/12 via-surface to-surface px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/25 ring-2 ring-white/20 dark:ring-white/10">
            <RateBotAvatar size={22} variant="onBrand" className="text-white" />
          </div>
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-emerald-500" />
        </div>

        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-text">RateBot</p>
          <p className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Online
          </p>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close RateBot"
        className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-hover transition-colors"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="w-4 h-4"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
