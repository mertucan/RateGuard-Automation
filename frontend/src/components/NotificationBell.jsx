import { useState, useEffect, useRef } from 'react'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api'

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const load = async () => {
    try {
      const data = await getNotifications({ unread: 'true' })
      setNotifications(data)
    } catch {
      /* silent */
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch {
      /* silent */
    }
  }

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead()
      setNotifications([])
    } catch {
      /* silent */
    }
  }

  const TYPE_ICON = { warning: 'warning', danger: 'error', info: 'info', success: 'check_circle' }
  const TYPE_COLOR = {
    warning: 'text-amber-500',
    danger: 'text-red-500',
    info: 'text-blue-500',
    success: 'text-emerald-500',
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-hover hover:text-text"
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        {notifications.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-surface shadow-xl z-50">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h4 className="text-sm font-bold">Notifications</h4>
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs font-medium text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <span className="material-symbols-outlined text-2xl text-text-muted">
                  notifications_off
                </span>
                <p className="mt-1 text-xs text-text-muted">No new notifications</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-hover cursor-pointer"
                  onClick={() => handleMarkRead(n.id)}
                >
                  <span
                    className={`material-symbols-outlined text-lg shrink-0 mt-0.5 ${
                      TYPE_COLOR[n.type] || 'text-text-muted'
                    }`}
                  >
                    {TYPE_ICON[n.type] || 'info'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{n.title}</p>
                    <p className="text-xs text-text-muted line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-text-muted mt-1">
                      {new Date(n.created_at).toLocaleString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
