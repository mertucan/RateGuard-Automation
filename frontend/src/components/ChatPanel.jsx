import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getContractMessages, sendContractMessage, analyzeContractTone } from '../api'
import { formatDisplayDateTime } from '../utils/dateFormat'

export default function ChatPanel({ contractId }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [analyzingTone, setAnalyzingTone] = useState(false)
  const scrollRef = useRef(null)
  const pollRef = useRef(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleAnalyzeTone = async () => {
    setAnalyzingTone(true)
    try {
      const result = await analyzeContractTone(contractId)
      showToast(`Tone detected: ${result.tone} (${result.messages_analyzed} messages analyzed)`)
    } catch (err) {
      showToast("Tone analysis failed: " + err.message, "error")
    } finally {
      setAnalyzingTone(false)
    }
  }

  const loadMessages = useCallback(async () => {
    try {
      const data = await getContractMessages(contractId)
      setMessages(data)
    } catch (err) {
      console.error('Chat load error:', err)
    } finally {
      setLoading(false)
    }
  }, [contractId])

  useEffect(() => {
    loadMessages()
    pollRef.current = setInterval(loadMessages, 10000)
    return () => clearInterval(pollRef.current)
  }, [loadMessages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!newMsg.trim() || sending) return
    setSending(true)
    try {
      await sendContractMessage(contractId, { message_text: newMsg.trim() })
      setNewMsg('')
      await loadMessages()
    } catch (err) {
      console.error('Send error:', err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isOwn = (msg) => msg.sender_user_id === user?.id

  const ROLE_BADGE = {
    sales: 'bg-blue-500/10 text-blue-500',
    client: 'bg-emerald-500/10 text-emerald-500',
    finance: 'bg-amber-500/10 text-amber-500',
    company_admin: 'bg-purple-500/10 text-purple-500',
    super_admin: 'bg-red-500/10 text-red-500',
  }

  return (
    <div className="relative flex h-full flex-col rounded-xl border border-border bg-surface">
      {toast && (
        <div className={`absolute left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-all ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
          {toast.msg}
        </div>
      )}
      <div className="flex items-center justify-between border-b border-border bg-surface-alt px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">chat</span>
          <h3 className="text-lg font-bold">Contract Chat</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAnalyzeTone}
            disabled={analyzingTone || messages.length === 0}
            className="flex items-center gap-1.5 rounded bg-primary-soft px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
            title="Analyze Communication Tone"
          >
            <span className="material-symbols-outlined text-[14px]">psychology</span>
            {analyzingTone ? 'Analyzing...' : 'Analyze Tone'}
          </button>
          <span className="text-xs text-text-muted">{messages.length} msgs</span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ maxHeight: '300px', minHeight: '150px' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="material-symbols-outlined text-3xl text-text-muted mb-2">forum</span>
            <p className="text-sm text-text-muted">No messages yet. Start the conversation.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const own = isOwn(msg)
            const sender = msg.users || {}
            const initials = (sender.full_name || '?')
              .split(' ')
              .map((w) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)

            return (
              <div key={msg.id} className={`flex gap-3 ${own ? 'flex-row-reverse' : ''}`}>
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    own ? 'bg-primary text-white' : 'bg-surface-alt text-text-muted'
                  }`}
                >
                  {initials}
                </div>
                <div className={`max-w-[75%] ${own ? 'text-right' : ''}`}>
                  <div className={`flex items-center gap-2 mb-1 ${own ? 'justify-end' : ''}`}>
                    <span className="text-xs font-semibold">{sender.full_name || 'Unknown'}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                        ROLE_BADGE[sender.role] || 'bg-text-muted/10 text-text-muted'
                      }`}
                    >
                      {sender.role || 'user'}
                    </span>
                  </div>
                  <div
                    className={`rounded-xl px-3 py-2 text-sm inline-block ${
                      own
                        ? 'bg-primary text-white rounded-tr-sm'
                        : 'bg-surface-alt text-text rounded-tl-sm'
                    }`}
                  >
                    {msg.message_text}
                  </div>
                  <span className="text-[10px] text-text-muted mt-0.5 block">
                    {formatDisplayDateTime(msg.created_at)}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {user && user.role !== 'finance' && (
        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <textarea
              className="flex-1 resize-none rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Type a message..."
              rows={2}
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={handleSend}
              disabled={!newMsg.trim() || sending}
              className="flex items-center justify-center rounded-lg bg-primary px-4 text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </div>
        </div>
      )}
      {user && user.role === 'finance' && (
        <div className="border-t border-border p-3 bg-surface-alt/50 text-center">
          <p className="text-xs text-text-muted italic">
            Finance role has read-only access to chat.
          </p>
        </div>
      )}
    </div>
  )
}
