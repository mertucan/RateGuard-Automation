import { useEffect, useMemo, useState } from 'react'
import { getAuditLogs } from '../api'
import { PageLoader } from '../components/Spinner'
import { formatDisplayDateTime } from '../utils/dateFormat'

const ACTION_META = {
  create: { label: 'Created', verb: 'created', icon: 'add_circle', tone: 'emerald' },
  create_contract_version: { label: 'New version', verb: 'created a new version of', icon: 'difference', tone: 'blue' },
  update: { label: 'Updated', verb: 'updated', icon: 'edit', tone: 'amber' },
  delete: { label: 'Deleted', verb: 'deleted', icon: 'delete', tone: 'red' },
  cancel: { label: 'Cancelled', verb: 'cancelled', icon: 'block', tone: 'red' },
  approve: { label: 'Approved', verb: 'approved', icon: 'verified', tone: 'emerald' },
  finance_approve: { label: 'Finance approved', verb: 'approved finance review for', icon: 'calculate', tone: 'emerald' },
  admin_approve: { label: 'Admin approved', verb: 'approved client sending for', icon: 'admin_panel_settings', tone: 'blue' },
  send_to_client: { label: 'Sent to client', verb: 'sent to client', icon: 'send', tone: 'blue' },
  client_approve: { label: 'Client approved', verb: 'client approved', icon: 'task_alt', tone: 'emerald' },
  client_reject: { label: 'Client rejected', verb: 'client rejected', icon: 'cancel', tone: 'red' },
  notify_sales: { label: 'Sales notified', verb: 'notified sales about', icon: 'forward_to_inbox', tone: 'amber' },
  generate_contract_ai_analysis: { label: 'AI analysis', verb: 'generated AI analysis for', icon: 'psychology', tone: 'violet' },
  login: { label: 'Login', verb: 'logged into', icon: 'login', tone: 'blue' },
  draft: { label: 'Draft saved', verb: 'saved draft for', icon: 'edit_note', tone: 'amber' },
}

const TONE_CLASS = {
  amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  red: 'bg-red-500/10 text-red-600 border-red-500/20',
  violet: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  slate: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
}

const ENTITY_LABELS = {
  all: 'All types',
  contract: 'Contracts',
  company: 'Companies',
  user: 'Users',
}

function actionMeta(action = '') {
  return ACTION_META[action] || {
    label: titleize(action || 'activity'),
    verb: action || 'changed',
    icon: 'history',
    tone: 'slate',
  }
}

function titleize(value = '') {
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function normalizeDetails(details) {
  if (!details) return null
  if (typeof details === 'string') {
    try {
      return JSON.parse(details)
    } catch {
      return details
    }
  }
  return details
}

function formatValue(key, value) {
  if (value == null || value === '') return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  const keyText = String(key).toLowerCase()
  if (keyText.includes('date') || keyText.endsWith('_at')) {
    return formatDisplayDateTime(value, String(value))
  }
  if (keyText.includes('amount') || keyText.includes('value')) {
    const numeric = Number(value)
    if (!Number.isNaN(numeric)) {
      return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(numeric)
    }
  }
  return String(value)
}

function formatDetails(details) {
  const normalized = normalizeDetails(details)
  if (!normalized) return null
  if (typeof normalized !== 'object') return <p className="text-xs leading-5 text-text-muted">{String(normalized)}</p>

  const entries = Object.entries(normalized)
  if (!entries.length) return null

  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-lg border border-border bg-surface px-3 py-2">
          <dt className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
            {titleize(key)}
          </dt>
          <dd className="mt-1 break-words text-xs font-semibold text-text">
            {formatValue(key, value)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function formatTime(value) {
  return formatDisplayDateTime(value)
}

function matchesSearch(log, query) {
  if (!query) return true
  const haystack = [
    log.user_name,
    log.action,
    log.entity_type,
    log.entity_id,
    typeof log.details === 'string' ? log.details : JSON.stringify(log.details || {}),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    const params = { limit: 150 }
    if (filter !== 'all') params.entity_type = filter
    getAuditLogs(params)
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Audit log error:', err))
      .finally(() => setLoading(false))
  }, [filter])

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase()
    return logs.filter((log) => matchesSearch(log, query))
  }, [logs, search])

  const summary = useMemo(() => {
    const users = new Set(logs.map((log) => log.user_name || 'System'))
    const contracts = logs.filter((log) => log.entity_type === 'contract').length
    const approvals = logs.filter((log) => String(log.action || '').includes('approve')).length
    return {
      total: logs.length,
      users: users.size,
      contracts,
      approvals,
    }
  }, [logs])

  if (loading) return <PageLoader />

  return (
    <div className="h-full overflow-y-auto bg-bg text-text">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-8 sm:py-7">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl">Audit Log</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                Review approvals, contract changes, client decisions, and operational activity.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex min-w-[240px] items-center gap-2 rounded-lg border border-border bg-surface-alt px-3 py-2">
                <span className="material-symbols-outlined text-[18px] text-text-muted">search</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search user, action, ID..."
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted"
                />
              </div>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="rg-select rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm font-semibold text-text outline-none focus:border-primary"
              >
                {Object.entries(ENTITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
        </header>

        <div className="flex flex-wrap gap-2 text-xs font-semibold text-text-muted">
          <span className="rounded-full border border-border bg-surface px-3 py-1.5">{summary.total} events</span>
          <span className="rounded-full border border-border bg-surface px-3 py-1.5">{summary.users} actors</span>
          <span className="rounded-full border border-border bg-surface px-3 py-1.5">{summary.contracts} contract events</span>
          <span className="rounded-full border border-border bg-surface px-3 py-1.5">{summary.approvals} approvals</span>
        </div>

        <main>
          {filteredLogs.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-12 text-center">
              <span className="material-symbols-outlined mb-3 text-5xl text-text-muted">manage_search</span>
              <p className="text-sm font-semibold">No matching activity</p>
              <p className="mt-1 text-sm text-text-muted">Try a different search term or activity type.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const meta = actionMeta(log.action)
                const tone = TONE_CLASS[meta.tone] || TONE_CLASS.slate
                return (
                  <article
                    key={log.id}
                    className="overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-primary/30"
                  >
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${tone}`}>
                        <span className="material-symbols-outlined text-[19px]">{meta.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm leading-6">
                              <span className="font-bold">{log.user_name || 'System'}</span>
                              <span className="text-text-muted"> {meta.verb} </span>
                              <span className="font-bold text-primary">{titleize(log.entity_type || 'record')}</span>
                              {log.entity_id && (
                                <span className="ml-2 rounded-full bg-surface-alt px-2 py-0.5 font-mono text-[10px] font-semibold text-text-muted">
                                  {String(log.entity_id).slice(0, 8)}
                                </span>
                              )}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${tone}`}>
                                {meta.label}
                              </span>
                              <span className="rounded-full border border-border bg-surface-alt px-2.5 py-1 text-[11px] font-semibold text-text-muted">
                                {titleize(log.entity_type || 'system')}
                              </span>
                            </div>
                          </div>
                          <time className="shrink-0 text-xs font-semibold text-text-muted">
                            {formatTime(log.created_at)}
                          </time>
                        </div>
                        {log.details && (
                          <div className="mt-3 rounded-lg border border-border bg-surface-alt p-3">
                            {formatDetails(log.details)}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
