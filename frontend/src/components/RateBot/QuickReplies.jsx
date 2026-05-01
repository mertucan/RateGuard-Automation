const QUICK_QUESTIONS = [
  "What is the contract end date?",
  "Summarize this contract",
  "What are the critical obligations?",
  "What is the inflation adjustment rate?",
  "Is the max increase limit applied?",
];

export default function QuickReplies({ onSelect, disabled, onDismiss }) {
  return (
    <div className="border-t border-border/80 bg-surface-alt/50 px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Suggested prompts
        </p>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-text-muted hover:bg-hover hover:text-text"
          >
            Hide
          </button>
        )}
      </div>
      <div className="flex max-h-[4.5rem] flex-wrap gap-1 overflow-y-auto scrollbar-thin">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onSelect(q)}
            disabled={disabled}
            className="max-w-full truncate rounded-full border border-border/90 bg-surface px-2.5 py-1 text-[11px] font-medium text-text-muted shadow-sm transition-colors hover:border-primary/50 hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            title={q}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
