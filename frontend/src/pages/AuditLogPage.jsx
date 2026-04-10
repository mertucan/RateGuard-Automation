import { useEffect, useState } from 'react'
import { getAuditLogs } from '../api'
import { PageLoader } from '../components/Spinner'

const ACTION_STYLE = {
  approve: { icon: 'verified', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  reject: { icon: 'cancel', color: 'text-red-500', bg: 'bg-red-500/10' },
  create: { icon: 'add_circle', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  update: { icon: 'edit', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  delete: { icon: 'delete', color: 'text-red-500', bg: 'bg-red-500/10' },
  login: { icon: 'login', color: 'text-primary', bg: 'bg-primary/10' },
  draft: { icon: 'edit_note', color: 'text-amber-500', bg: 'bg-amber-500/10' },
}

function formatDetails(details) {
  if (!details) return null
  let obj = details
  if (typeof details === 'string') {
    try {
      obj = JSON.parse(details)
    } catch {
      return <span>{details}</span>
    }
  }
  if (typeof obj !== 'object') return <span>{String(obj)}</span>

  const parts = []
  for (const [k, v] of Object.entries(obj)) {
    const keyName = k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    let valStr = String(v)
    if (k.toLowerCase().includes('amount') || k.toLowerCase().includes('value')) {
      valStr = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(v) || 0)
    }
    parts.push(
      <div key={k} className="flex items-center justify-between border-b border-border/50 py-1 last:border-0">
        <span className="font-medium text-text-muted">{keyName}</span>
        <span className="font-semibold text-text">{valStr}</span>
      </div>
    )
  }
  return parts.length > 0 ? <div className="flex flex-col gap-1">{parts}</div> : null
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (filter !== 'all') params.entity_type = filter
    getAuditLogs(params)
      .then(setLogs)
      .catch((err) => console.error('Audit log error:', err))
      .finally(() => setLoading(false))
  }, [filter])

  if (loading) return <PageLoader />

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-text">
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-4 sm:px-8 sm:py-5">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold sm:text-2xl">Audit Log</h2>
          <p className="mt-1 hidden text-sm text-text-muted sm:block">
            Track all system actions for compliance and transparency.
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text outline-none focus:border-primary"
        >
          <option value="all">All Types</option>
          <option value="contract">Contracts</option>
          <option value="company">Companies</option>
          <option value="user">Users</option>
        </select>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto max-w-4xl">
          {logs.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-12 text-center">
              <span className="material-symbols-outlined mb-2 text-4xl text-text-muted">history</span>
              <p className="text-sm text-text-muted">No audit logs found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const style = ACTION_STYLE[log.action] || ACTION_STYLE.update
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/20"
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.bg}`}
                    >
                      <span className={`material-symbols-outlined text-lg ${style.color}`}>
                        {style.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-sm text-text">
                        <span className="font-bold">{log.user_name || 'System'}</span>
                        <span className="text-text-muted">
                          {log.action === 'create' && 'created a new'}
                          {log.action === 'update' && 'updated the'}
                          {log.action === 'delete' && 'deleted the'}
                          {log.action === 'approve' && 'approved the'}
                          {log.action === 'reject' && 'rejected the'}
                          {log.action === 'login' && 'logged into'}
                          {!['create', 'update', 'delete', 'approve', 'reject', 'login'].includes(log.action) && log.action}
                        </span>
                        <span className="font-semibold text-primary">{log.entity_type}</span>
                        {log.entity_id && <span className="text-xs text-text-muted">(ID: {log.entity_id.slice(0, 8)})</span>}
                      </div>
                      {log.details && (
                        <div className="mt-2 rounded-lg bg-surface-alt p-3 text-xs text-text">
                          {formatDetails(log.details)}
                        </div>
                      )}
                      <p className="mt-2 text-[11px] font-medium text-text-muted">
                        {new Date(log.created_at).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
