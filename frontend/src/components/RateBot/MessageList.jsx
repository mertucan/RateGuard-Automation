import { useEffect, useRef } from "react";
import RateBotAvatar from "./RateBotAvatar";

function BotGlyphBubble() {
  return (
    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/12 ring-1 ring-primary/15">
      <RateBotAvatar size={16} variant="soft" className="text-primary" />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <BotGlyphBubble />
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
      <BotGlyphBubble />
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
      <BotGlyphBubble />
      <div className="max-w-[78%] rounded-2xl rounded-bl-sm border border-border/90 bg-surface px-4 py-2.5 text-sm leading-relaxed text-text shadow-sm">
        <p>
          Hi! I&apos;m <span className="font-semibold text-primary">RateBot</span> — your contract analysis assistant.
        </p>
        <p className="mt-1 text-[12px] text-text-muted">
          Ask about this contract or open suggested prompts below — they hide once you start chatting to keep the view clean.
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
    <div className="flex-1 space-y-3 overflow-y-auto bg-bg/30 px-4 py-4 scrollbar-thin">
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
