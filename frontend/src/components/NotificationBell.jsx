import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api'
import { formatDisplayDateTime } from '../utils/dateFormat'

export default function NotificationBell() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const loadingRef = useRef(false)

  const load = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    try {
      const params = { unread: 'true', limit: 30 }
      const data = await getNotifications(params)
      setNotifications(data)
    } catch {
      /* silent */
    } finally {
      loadingRef.current = false
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleNotificationClick = async (notification) => {
    try {
      await markNotificationRead(notification.id)
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
      setOpen(false)
      const url = notification.action_url || (notification.contract_id ? `/renewal-review/${notification.contract_id}` : '')
      if (url && url.startsWith('/') && !url.startsWith('//')) {
        navigate(url)
      }
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
        title="Notifications"
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        {notifications.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-1rem),22rem)] overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h4 className="text-sm font-bold">Notifications</h4>
              <p className="text-[11px] text-text-muted">Unread workflow updates</p>
            </div>
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
                <button
                  key={n.id}
                  type="button"
                  className="flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-hover"
                  onClick={() => handleNotificationClick(n)}
                >
                  <span
                    className={`material-symbols-outlined text-lg shrink-0 mt-0.5 ${
                      TYPE_COLOR[n.type] || 'text-text-muted'
                    }`}
                  >
                    {TYPE_ICON[n.type] || 'info'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold">{n.title}</p>
                    <p className="text-xs text-text-muted line-clamp-2">{n.message}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-[10px] text-text-muted">
                      {formatDisplayDateTime(n.created_at)}
                      </p>
                      {(n.action_url || n.contract_id) && (
                        <span className="text-[10px] font-semibold text-primary">Open</span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
