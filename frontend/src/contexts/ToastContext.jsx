import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

let _nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  /**
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {number|false} duration  ms to auto-dismiss; false = persistent until closed
   */
  const toast = useCallback(
    (message, type = 'info', duration) => {
      const id = _nextId++
      // errors & warnings stay until manually closed; success/info auto-dismiss in 4s
      const autoDismiss = duration !== undefined ? duration : (type === 'success' || type === 'info' ? 4000 : false)

      setToasts((prev) => [...prev, { id, message, type }])

      if (autoDismiss) {
        timers.current[id] = setTimeout(() => dismiss(id), autoDismiss)
      }
      return id
    },
    [dismiss]
  )

  const success = useCallback((msg, duration) => toast(msg, 'success', duration), [toast])
  const error   = useCallback((msg, duration) => toast(msg, 'error',   duration), [toast])
  const warning = useCallback((msg, duration) => toast(msg, 'warning', duration), [toast])
  const info    = useCallback((msg, duration) => toast(msg, 'info',    duration), [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

/* ─── Icons & styles per type ─── */
const TYPE_CONFIG = {
  success: {
    icon: 'check_circle',
    bar: 'bg-emerald-500',
    iconCls: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  error: {
    icon: 'error',
    bar: 'bg-red-500',
    iconCls: 'text-red-400',
    border: 'border-red-500/20',
  },
  warning: {
    icon: 'warning',
    bar: 'bg-amber-500',
    iconCls: 'text-amber-400',
    border: 'border-amber-500/20',
  },
  info: {
    icon: 'info',
    bar: 'bg-sky-500',
    iconCls: 'text-sky-400',
    border: 'border-sky-500/20',
  },
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast: t, onDismiss }) {
  const cfg = TYPE_CONFIG[t.type] || TYPE_CONFIG.info

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${cfg.border} bg-surface shadow-2xl shadow-black/30 overflow-hidden animate-slide-up`}
      role="alert"
    >
      {/* Left accent bar */}
      <div className={`w-1 shrink-0 self-stretch ${cfg.bar}`} />

      <div className="flex flex-1 items-start gap-3 py-3 pr-3">
        <span className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${cfg.iconCls}`}
          style={{ fontVariationSettings: "'FILL' 1" }}>
          {cfg.icon}
        </span>

        <p className="flex-1 text-sm text-text leading-snug">{t.message}</p>

        <button
          onClick={() => onDismiss(t.id)}
          className="shrink-0 text-text-muted hover:text-text transition-colors ml-1"
          aria-label="Dismiss"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>
  )
}
