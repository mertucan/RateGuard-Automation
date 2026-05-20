import { useState, useCallback, useRef, useEffect } from "react";
import { ratebotChat } from "../../api";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import QuickReplies from "./QuickReplies";
import MessageInput from "./MessageInput";
import RateBotAvatar from "./RateBotAvatar";

let msgCounter = 0;
const newId = () => `msg-${++msgCounter}`;

export default function RateBot({ contractId = null }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(true);
  const historyRef = useRef([]);

  useEffect(() => {
    // Reset bot session whenever user leaves/changes contract detail.
    setMessages([]);
    historyRef.current = [];
    setIsTyping(false);
    setQuickRepliesOpen(true);

    // Keep it closed by default; user opens from FAB.
    setOpen(false);
  }, [contractId]);

  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() || isTyping) return;

      setQuickRepliesOpen(false);

      // Add user message
      const userMsg = { id: newId(), role: "user", text };
      setMessages((prev) => [...prev, userMsg]);

      // Track history for context
      historyRef.current = [
        ...historyRef.current,
        { role: "user", text },
      ];

      setIsTyping(true);

      try {
        const { reply } = await ratebotChat({
          message: text,
          contract_id: contractId || undefined,
          history: historyRef.current.slice(-10),
        });

        const botMsg = { id: newId(), role: "bot", text: reply };
        setMessages((prev) => [...prev, botMsg]);
        historyRef.current = [
          ...historyRef.current,
          { role: "model", text: reply },
        ];
      } catch {
        const errMsg = {
          id: newId(),
          role: "bot",
          text:
            "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping, contractId]
  );

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  if (!contractId) {
    return null;
  }

  return (
    <>
      {/* ── Chat Window ── */}
      {open && (
        <div
          className="fixed bottom-20 right-5 z-50 flex w-[min(100vw-1.5rem,380px)] flex-col overflow-hidden rounded-2xl border border-border/90 bg-surface shadow-2xl shadow-black/20 ring-1 ring-black/5 dark:bg-surface dark:ring-white/10"
          style={{
            height: "min(78vh, 540px)",
            animation: "ratebotSlideUp 0.22s cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          <ChatHeader onClose={handleClose} />
          <MessageList messages={messages} isTyping={isTyping} />
          {quickRepliesOpen && (
            <QuickReplies
              onSelect={sendMessage}
              disabled={isTyping}
              onDismiss={() => setQuickRepliesOpen(false)}
            />
          )}
          <MessageInput
            onSend={sendMessage}
            disabled={isTyping}
            promptsAvailable={!quickRepliesOpen}
            onOpenPrompts={() => setQuickRepliesOpen(true)}
          />
        </div>
      )}

      {/* ── FAB Button ── */}
      <button
        type="button"
        onClick={open ? handleClose : handleOpen}
        aria-label={open ? "Close RateBot" : "Open RateBot"}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 transition-all hover:bg-primary-dark active:scale-95"
      >
        {open ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="h-5 w-5"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <RateBotAvatar size={26} variant="onBrand" className="text-white" />
        )}
      </button>

      {/* ── Keyframe animation ── */}
      <style>{`
        @keyframes ratebotSlideUp {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}
