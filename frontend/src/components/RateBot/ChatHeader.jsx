export default function ChatHeader({ onClose }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface rounded-t-2xl">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-5 h-5 text-white"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2z" />
              <path d="M3 20c0-4 4-7 9-7s9 3 9 7" />
              <circle cx="18" cy="8" r="3" fill="currentColor" stroke="none" className="text-primary-dark" />
              <path d="M16.5 8h3M18 6.5v3" strokeWidth="1.5" stroke="white" />
            </svg>
          </div>
          {/* Online dot */}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-surface rounded-full" />
        </div>

        {/* Name + status */}
        <div className="leading-tight">
          <p className="text-sm font-semibold text-text">RateBot</p>
          <p className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
