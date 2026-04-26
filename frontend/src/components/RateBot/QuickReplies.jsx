const QUICK_QUESTIONS = [
  "What is the contract end date?",
  "Summarize this contract",
  "What are the critical obligations?",
  "What is the inflation adjustment rate?",
  "Is the max increase limit applied?",
];

export default function QuickReplies({ onSelect, disabled }) {
  return (
    <div className="px-4 pb-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">
        Quick Questions
      </p>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            disabled={disabled}
            className="px-3 py-1.5 rounded-full border border-border bg-surface text-[12px] font-medium text-text-muted hover:border-primary hover:text-primary hover:bg-primary-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
