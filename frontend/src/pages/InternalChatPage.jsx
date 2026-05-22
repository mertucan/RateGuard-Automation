import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  createInternalChatConversation,
  getInternalChatConversations,
  getInternalChatMessages,
  getInternalChatUsers,
  sendInternalChatMessage,
} from "../api";
import { PageLoader } from "../components/Spinner";

const MESSAGE_POLL_INTERVAL_MS = 2000;

const ROLE_LABELS = {
  super_admin: "Super Admin",
  company_admin: "Company Admin",
  finance: "Finance",
  sales: "Sales",
  hr: "HR",
  user: "User",
};

function initials(name = "") {
  const parts = String(name || "User").trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "U") + (parts[1]?.[0] || "");
}

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
  });
}

function participantSubtitle(participants = []) {
  return (Array.isArray(participants) ? participants : [])
    .filter(Boolean)
    .map((p) => `${p.full_name || p.email || "Unknown user"} (${ROLE_LABELS[p.role] || p.role || "User"})`)
    .join(", ");
}

function normalizeChatUser(item) {
  if (!item || !item.id) return null;
  return {
    id: item.id,
    full_name: item.full_name || "",
    email: item.email || "",
    role: item.role || "user",
    company_id: item.company_id || null,
  };
}

function isCurrentChatUser(item, currentUser) {
  if (!item || !currentUser) return false;
  if (item.id && currentUser.id && String(item.id) === String(currentUser.id)) {
    return true;
  }
  const itemEmail = String(item.email || "").trim().toLowerCase();
  const currentEmail = String(currentUser.email || "").trim().toLowerCase();
  return Boolean(itemEmail && currentEmail && itemEmail === currentEmail);
}

export default function InternalChatPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  const isSuperAdmin = user?.role === "super_admin";

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedId) || null,
    [conversations, selectedId],
  );

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((conversation) => {
      const haystack = [
        conversation.display_title,
        conversation.companies?.company_name,
        conversation.last_message?.message_text,
        participantSubtitle(conversation.participants),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [conversations, search]);

  const loadConversations = useCallback(async () => {
    const data = await getInternalChatConversations();
    setConversations(Array.isArray(data) ? data : []);
    setSelectedId((current) => current || data?.[0]?.id || null);
  }, []);

  const loadMessages = useCallback(async (conversationId, options = {}) => {
    const { showLoading = false } = options;
    if (!conversationId) {
      setMessages([]);
      return;
    }
    if (showLoading) setMessagesLoading(true);
    try {
      const data = await getInternalChatMessages(conversationId);
      const incomingMessages = Array.isArray(data) ? data : [];
      setMessages((prev) => {
        const pendingMessages = prev.filter((message) => message.delivery_status === "sending");
        return [...incomingMessages, ...pendingMessages];
      });
    } finally {
      if (showLoading) setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [conversationData, userData] = await Promise.all([
          getInternalChatConversations(),
          getInternalChatUsers(),
        ]);
        if (cancelled) return;
        setConversations(Array.isArray(conversationData) ? conversationData : []);
        setUsers(
          (Array.isArray(userData) ? userData : [])
            .map(normalizeChatUser)
            .filter((item) =>
              item && !isCurrentChatUser(item, { id: user?.id, email: user?.email }),
            ),
        );
        setSelectedId(conversationData?.[0]?.id || null);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.email, user?.id]);

  useEffect(() => {
    loadMessages(selectedId, { showLoading: true });
  }, [loadMessages, selectedId]);

  useEffect(() => {
    if (!selectedId) return undefined;
    const timer = setInterval(() => {
      loadMessages(selectedId);
      loadConversations().catch(() => {});
    }, MESSAGE_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadConversations, loadMessages, selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedId]);

  const toggleUser = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleCreateConversation = async () => {
    const teammateIds = selectedUserIds.filter((id) => {
      const selectedUser = users.find((item) => String(item.id) === String(id));
      return selectedUser && !isCurrentChatUser(selectedUser, user);
    });
    if (!teammateIds.length) {
      setError("Select at least one teammate.");
      return;
    }
    setError("");
    setCreatingConversation(true);
    try {
      const conversation = await createInternalChatConversation({
        participant_ids: teammateIds,
        title: newTitle,
      });
      setConversations((prev) => [conversation, ...prev.filter((item) => item.id !== conversation.id)]);
      setSelectedId(conversation.id);
      setSelectedUserIds([]);
      setNewTitle("");
      setShowNewChat(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingConversation(false);
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !selectedId || isSuperAdmin) return;
    const tempId = `pending-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      sender_user_id: user?.id,
      sender: user,
      message_text: text,
      created_at: new Date().toISOString(),
      delivery_status: "sending",
    };
    setDraft("");
    setError("");
    setMessages((prev) => [...prev, optimisticMessage]);
    try {
      const message = await sendInternalChatMessage(selectedId, { message_text: text });
      setMessages((prev) =>
        prev.map((item) =>
          item.id === tempId ? { ...message, sender: user, delivery_status: "sent" } : item,
        ),
      );
      await loadConversations();
    } catch (err) {
      setError(err.message);
      setDraft(text);
      setMessages((prev) => prev.filter((item) => item.id !== tempId));
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="flex h-full min-h-0 bg-bg text-text">
      <aside className={`${selectedConversation ? "hidden md:flex" : "flex"} w-full min-w-0 flex-col border-r border-border bg-surface md:w-[360px] lg:w-[400px]`}>
        <div className="border-b border-border bg-primary px-4 py-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold">Company Chat</h1>
              <p className="text-xs text-white/80">
                {isSuperAdmin ? "Super admin read-only overview" : "Internal team messaging"}
              </p>
            </div>
            {!isSuperAdmin && (
              <button
                type="button"
                onClick={() => setShowNewChat(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
                title="New chat"
              >
                <span className="material-symbols-outlined text-[22px]">edit_square</span>
              </button>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-full bg-white/15 px-3 py-2">
            <span className="material-symbols-outlined text-[18px] text-white/80">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/70"
            />
          </div>
        </div>

        {error && (
          <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-600">
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-8 text-center">
              <span className="material-symbols-outlined text-5xl text-text-muted">forum</span>
              <p className="mt-3 text-sm font-semibold">No chats yet</p>
              <p className="mt-1 text-xs leading-5 text-text-muted">
                Start a conversation with someone in your company.
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const active = conversation.id === selectedId;
              const last = conversation.last_message;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={`flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors ${
                    active ? "bg-primary-soft" : "hover:bg-hover"
                  }`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {initials(conversation.display_title)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold">{conversation.display_title}</p>
                      <span className="shrink-0 text-[11px] text-text-muted">
                        {formatDay(last?.created_at || conversation.updated_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-text-muted">
                      {last?.message_text || participantSubtitle(conversation.participants)}
                    </p>
                    {isSuperAdmin && conversation.companies?.company_name && (
                      <p className="mt-1 truncate text-[11px] font-semibold text-primary">
                        {conversation.companies.company_name}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <main className={`${selectedConversation ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-[#efeae2] dark:bg-bg`}>
        {selectedConversation ? (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-hover md:hidden"
                >
                  <span className="material-symbols-outlined text-[21px]">arrow_back</span>
                </button>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {initials(selectedConversation.display_title)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{selectedConversation.display_title}</p>
                  <p className="truncate text-xs text-text-muted">
                    {participantSubtitle(selectedConversation.participants)}
                  </p>
                </div>
              </div>
              {isSuperAdmin && (
                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600">
                  Read-only
                </span>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {messagesLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-text-muted">
                  Loading messages...
                </div>
              ) : (
                <div className="mx-auto flex max-w-4xl flex-col gap-2">
                  {messages.length === 0 && !draft.trim() && (
                    <div className="mx-auto mt-10 rounded-lg bg-white/80 px-4 py-2 text-xs font-medium text-slate-600 shadow-sm dark:bg-surface">
                      Messages in this conversation will appear here.
                    </div>
                  )}
                  {messages.map((message) => {
                    const mine = message.sender_user_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[72%] rounded-lg px-3 py-2 shadow-sm ${
                            mine
                              ? "rounded-br-sm bg-[#d9fdd3] text-slate-900"
                              : "rounded-bl-sm bg-white text-slate-900 dark:bg-surface dark:text-text"
                          }`}
                        >
                          {!mine && (
                            <p className="mb-1 text-[11px] font-bold text-primary">
                              {message.sender?.full_name || "Unknown user"}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap text-sm leading-5">{message.message_text}</p>
                          <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500">
                            <span>{formatTime(message.created_at)}</span>
                            {mine && (
                              <span
                                className={`material-symbols-outlined notranslate inline-flex w-4 justify-end text-[15px] leading-none ${
                                  message.delivery_status === "sending"
                                    ? "text-slate-400"
                                    : "text-primary"
                                }`}
                                translate="no"
                                title={message.delivery_status === "sending" ? "Sending" : "Sent"}
                              >
                                {message.delivery_status === "sending" ? "done" : "done_all"}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="flex shrink-0 items-center gap-3 border-t border-border bg-surface px-4 py-3">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted hover:bg-hover"
                disabled={isSuperAdmin}
              >
                <span className="material-symbols-outlined text-[22px]">add_reaction</span>
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={isSuperAdmin}
                placeholder={isSuperAdmin ? "Super admins can read all chats" : "Type a message"}
                className="min-w-0 flex-1 rounded-full border border-border bg-surface-alt px-4 py-3 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-70"
              />
              <button
                type="submit"
                disabled={!draft.trim() || isSuperAdmin}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-dark disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[21px]">send</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-6xl text-text-muted">chat</span>
            <p className="mt-3 text-lg font-bold">Select a conversation</p>
            <p className="mt-1 text-sm text-text-muted">Your internal chats stay inside your company workspace.</p>
          </div>
        )}
      </main>

      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-bold">New chat</h2>
                <p className="text-xs text-text-muted">Choose people from your company.</p>
              </div>
                <button
                  type="button"
                  onClick={() => setShowNewChat(false)}
                  disabled={creatingConversation}
                  className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-hover"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="space-y-4 p-5">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Group title (optional)"
                className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
                {users.length === 0 ? (
                  <p className="p-4 text-sm text-text-muted">No teammates found.</p>
                ) : (
                  users.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-hover"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(item.id)}
                        onChange={() => toggleUser(item.id)}
                      />
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                        {initials(item.full_name || item.email)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{item.full_name || item.email}</p>
                        <p className="truncate text-xs text-text-muted">
                          {ROLE_LABELS[item.role] || item.role}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewChat(false)}
                  disabled={creatingConversation}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateConversation}
                  disabled={creatingConversation || !selectedUserIds.length}
                  className="inline-flex min-w-[112px] items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingConversation && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}
                  {creatingConversation ? "Starting..." : "Start chat"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
