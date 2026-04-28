import { useState, useCallback, useRef } from "react";
import { ratebotChat } from "../../api";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import QuickReplies from "./QuickReplies";
import MessageInput from "./MessageInput";

let msgCounter = 0;
const newId = () => `msg-${++msgCounter}`;

export default function RateBot({ contractId = null }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const historyRef = useRef([]);

  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() || isTyping) return;

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
      } catch (err) {
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

  return (
    <>
      {/* ── Chat Window ── */}
      {open && (
        <div
          className="fixed bottom-20 right-5 z-50 flex flex-col w-[360px] bg-surface border border-border rounded-2xl overflow-hidden"
          style={{
            height: "520px",
            animation: "ratebotSlideUp 0.22s cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          <ChatHeader onClose={handleClose} />
          <MessageList messages={messages} isTyping={isTyping} />
          <QuickReplies onSelect={sendMessage} disabled={isTyping} />
          <MessageInput onSend={sendMessage} disabled={isTyping} />
        </div>
      )}

      {/* ── FAB Button ── */}
      <button
        onClick={open ? handleClose : handleOpen}
        aria-label={open ? "Close RateBot" : "Open RateBot"}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-all active:scale-95"
        style={{
          boxShadow: "0 4px 24px rgba(19,109,236,0.35)",
        }}
      >
        {open ? (
          /* X icon */
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="w-5 h-5"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          /* Chat icon */
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <path d="M8 10h8M8 14h5" />
          </svg>
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
