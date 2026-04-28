import { useEffect, useRef } from "react";

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-primary" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2z" />
          <path d="M3 20c0-4 4-7 9-7s9 3 9 7" />
        </svg>
      </div>
      <div className="bg-surface border border-border rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function UserMessage({ text }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%] bg-primary text-white px-4 py-2.5 rounded-2xl rounded-br-sm text-sm leading-relaxed">
        {text}
      </div>
    </div>
  );
}

function BotMessage({ text }) {
  // Render newlines and basic bullet points
  const lines = text.split("\n");
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-primary" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2z" />
          <path d="M3 20c0-4 4-7 9-7s9 3 9 7" />
        </svg>
      </div>
      <div className="max-w-[78%] bg-surface border border-border rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-text leading-relaxed">
        {lines.map((line, i) => {
          if (!line.trim()) return <div key={i} className="h-1" />;
          // Bold: **text**
          const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={j}>{part.slice(2, -2)}</strong>;
            }
            return part;
          });
          return (
            <p key={i} className="mb-0.5 last:mb-0">
              {parts}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function WelcomeMessage() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-primary" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2z" />
          <path d="M3 20c0-4 4-7 9-7s9 3 9 7" />
        </svg>
      </div>
      <div className="max-w-[78%] bg-surface border border-border rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-text leading-relaxed">
        <p>
          Hi! I&apos;m <span className="font-semibold text-primary">RateBot</span> — your contract analysis assistant.
        </p>
        <p className="mt-1 text-text-muted text-[12px]">
          Ask me anything about contracts, inflation adjustments, or use a quick question below.
        </p>
      </div>
    </div>
  );
}

export default function MessageList({ messages, isTyping }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">
      <WelcomeMessage />
      {messages.map((msg) =>
        msg.role === "user" ? (
          <UserMessage key={msg.id} text={msg.text} />
        ) : (
          <BotMessage key={msg.id} text={msg.text} />
        )
      )}
      {isTyping && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
