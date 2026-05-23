import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { getApplications, reviewApplication } from '../api'
import Spinner from '../components/Spinner'
import { formatDisplayDate } from '../utils/dateFormat'

const DEPT_LABELS = { sales: 'Sales', finance: 'Finance', hr: 'HR' }
const STATUS_BADGES = {
  pending: 'bg-amber-500/10 text-amber-500',
  approved: 'bg-emerald-500/10 text-emerald-500',
  rejected: 'bg-red-500/10 text-red-500',
}
const FILTER_OPTIONS = [
  { key: 'pending', label: 'Pending', icon: 'pending_actions' },
  { key: 'approved', label: 'Approved', icon: 'check_circle' },
  { key: 'rejected', label: 'Rejected', icon: 'cancel' },
  { key: 'all', label: 'All', icon: 'apps' },
]

const DECISION_PRESETS = {
  approved: [
    {
      label: 'Warm welcome',
      message: 'Welcome to the team. Your application has been approved and your workspace access has been updated.',
    },
    {
      label: 'Formal approval',
      message: 'Thank you for your application. We are happy to approve your request and assign you to this department.',
    },
  ],
  rejected: [
    {
      label: 'Polite decline',
      message: 'Thank you for your interest. We are not able to approve this application at this time.',
    },
    {
      label: 'Capacity note',
      message: 'Thank you for applying. We reviewed your request, but this department is not accepting new members right now.',
    },
  ],
}

function buildGeneratedMessage(app, status) {
  const dept = DEPT_LABELS[app?.target_department] || app?.target_department || 'the department'
  const company = app?.company?.company_name || 'our company'
  const name = app?.applicant?.full_name || 'there'
  if (status === 'approved') {
    return `Hi ${name}, your application to join the ${dept} department at ${company} has been approved. Your RateGuard role has been updated, and you can now continue from your dashboard. Welcome aboard.`
  }
  return `Hi ${name}, thank you for applying to the ${dept} department at ${company}. After reviewing your application, we are not able to approve it at this time. We appreciate your interest and encourage you to apply again when a suitable opportunity is available.`
}

export default function ApplicationManagementPage() {
  const { user } = useAuth()
  const { success: toastSuccess, error: toastError } = useToast()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [acting, setActing] = useState(null)
  const [decision, setDecision] = useState(null)
  const [decisionMessage, setDecisionMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getApplications()
      setApplications(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Applications load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openDecision = (app, status) => {
    setDecision({ app, status })
    setDecisionMessage(buildGeneratedMessage(app, status))
  }

  const closeDecision = () => {
    if (acting) return
    setDecision(null)
    setDecisionMessage('')
  }

  const handleReview = async () => {
    if (!decision?.app || !decision?.status) return
    setActing(decision.app.id)
    try {
      await reviewApplication(decision.app.id, {
        status: decision.status,
        reviewer_message: decisionMessage.trim(),
      })
      toastSuccess(decision.status === 'approved' ? 'Application approved! User has been assigned to the department.' : 'Application rejected.')
      setDecision(null)
      setDecisionMessage('')
      await load()
    } catch (err) {
      toastError(err.message || 'Failed to review application.')
    } finally {
      setActing(null)
    }
  }

  const filtered = applications.filter(a => filter === 'all' || a.status === filter)

  const counts = {
    all: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  }

  const scopeText =
    user?.role === 'super_admin'
      ? 'Review and approve applications across all companies.'
      : 'Review and approve applications submitted to your assigned company.'

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-text">
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-4 sm:px-8 sm:py-5">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">Application Management</h2>
          <p className="mt-1 hidden text-sm text-text-muted sm:block">
            {scopeText}
          </p>
        </div>
        {counts.pending > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-500">
            <span className="material-symbols-outlined text-[16px]">pending</span>
            {counts.pending} pending
          </span>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Filter Tabs */}
          <div className="grid w-full grid-cols-2 gap-2 rounded-xl border border-border bg-surface p-2 shadow-sm sm:grid-cols-4">
            {FILTER_OPTIONS.map(({ key, label, icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`flex min-h-12 min-w-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors sm:px-4 ${
                  filter === key
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface-alt/60 text-text-muted hover:bg-hover hover:text-text'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="material-symbols-outlined shrink-0 text-[18px]">
                    {icon}
                  </span>
                  <span className="truncate">{label}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${filter === key ? 'bg-white/20 text-white' : 'bg-bg text-text'}`}>
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-12 text-center">
              <span className="material-symbols-outlined mb-3 block text-4xl text-text-muted">inbox</span>
              <p className="text-sm font-semibold text-text">No {filter === 'all' ? '' : filter} applications</p>
              <p className="mt-1 text-xs text-text-muted">Applications from users will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((app) => (
                <div
                  key={app.id}
                  className="rounded-xl border border-border bg-surface p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                          {(app.applicant?.full_name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{app.applicant?.full_name || '—'}</p>
                          <p className="text-xs text-text-muted">{app.applicant?.email || '—'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                          {DEPT_LABELS[app.target_department] || app.target_department}
                        </span>
                        {user?.role === 'super_admin' && app.company?.company_name && (
                          <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-semibold text-text-muted">
                            {app.company.company_name}
                          </span>
                        )}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_BADGES[app.status] || ''}`}>
                          {app.status}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {formatDisplayDate(app.created_at)}
                        </span>
                      </div>

                      {app.message && (
                        <div className="rounded-lg border border-border bg-surface-alt p-3">
                          <p className="text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Message</p>
                          <p className="text-sm text-text">{app.message}</p>
                        </div>
                      )}
                    </div>

                    {app.status === 'pending' && (
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => openDecision(app, 'rejected')}
                          disabled={acting === app.id}
                          className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/5 disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => openDecision(app, 'approved')}
                          disabled={acting === app.id}
                          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                        >
                          {acting === app.id ? 'Processing...' : 'Approve'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {decision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">
                  {decision.status === 'approved' ? 'Approve application' : 'Reject application'}
                </h3>
                <p className="mt-1 text-xs text-text-muted">
                  {decision.app.applicant?.full_name || 'Applicant'} · {DEPT_LABELS[decision.app.target_department] || decision.app.target_department}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDecision}
                disabled={!!acting}
                className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-hover hover:text-text disabled:opacity-50"
                title="Close"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-surface-alt p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                  Message tools
                </p>
                <button
                  type="button"
                  onClick={() => setDecisionMessage(buildGeneratedMessage(decision.app, decision.status))}
                  className="inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-white"
                >
                  <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                  Generate
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(DECISION_PRESETS[decision.status] || []).map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setDecisionMessage(preset.message)}
                    className="rounded-md border border-border bg-surface px-3 py-2 text-left text-xs font-semibold text-text-muted transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-text-muted">
                Message included in email
              </span>
              <textarea
                value={decisionMessage}
                onChange={(event) => setDecisionMessage(event.target.value.slice(0, 1200))}
                rows={6}
                className="w-full resize-none rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>
            <div className="mt-1 text-right text-[10px] text-text-muted">
              {decisionMessage.length}/1200
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDecision}
                disabled={!!acting}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-muted transition-colors hover:bg-hover hover:text-text disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReview}
                disabled={!!acting}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-wait disabled:opacity-60 ${
                  decision.status === 'approved'
                    ? 'bg-emerald-500 hover:bg-emerald-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {acting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">
                    {decision.status === 'approved' ? 'check_circle' : 'cancel'}
                  </span>
                )}
                {acting ? 'Sending...' : decision.status === 'approved' ? 'Approve and send' : 'Reject and send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
