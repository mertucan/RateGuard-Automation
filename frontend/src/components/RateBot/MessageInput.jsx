import { useState } from "react";

export default function MessageInput({ onSend, disabled }) {
  const [value, setValue] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="px-4 pb-4 pt-2 border-t border-border bg-surface rounded-b-2xl"
    >
      <div className="flex items-center gap-2 bg-bg border border-border rounded-xl px-3 py-2 focus-within:border-primary transition-colors">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          placeholder="Send a message to RateBot..."
          className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5"
          >
            <path d="M22 2 11 13" />
            <path d="M22 2 15 22 11 13 2 9l20-7z" />
          </svg>
        </button>
      </div>
    </form>
  );
}
