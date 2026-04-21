import { useEffect, useState, useCallback } from 'react'
import { useToast } from '../contexts/ToastContext'
import { getApplications, reviewApplication } from '../api'
import Spinner from '../components/Spinner'

const DEPT_LABELS = { sales: 'Sales', finance: 'Finance' }
const STATUS_BADGES = {
  pending: 'bg-amber-500/10 text-amber-500',
  approved: 'bg-emerald-500/10 text-emerald-500',
  rejected: 'bg-red-500/10 text-red-500',
}

export default function ApplicationManagementPage() {
  const { success: toastSuccess, error: toastError } = useToast()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [acting, setActing] = useState(null)

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

  const handleReview = async (appId, status) => {
    setActing(appId)
    try {
      await reviewApplication(appId, { status })
      toastSuccess(status === 'approved' ? 'Application approved! User has been assigned to the department.' : 'Application rejected.')
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

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-text">
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-4 sm:px-8 sm:py-5">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">Application Management</h2>
          <p className="mt-1 hidden text-sm text-text-muted sm:block">
            Review and approve user applications to your company's departments.
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
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
            {[
              { key: 'pending', label: 'Pending' },
              { key: 'approved', label: 'Approved' },
              { key: 'rejected', label: 'Rejected' },
              { key: 'all', label: 'All' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === key ? 'bg-primary text-white' : 'text-text-muted hover:bg-hover hover:text-text'
                }`}
              >
                {label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${filter === key ? 'bg-white/20' : 'bg-surface-alt'}`}>
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
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_BADGES[app.status] || ''}`}>
                          {app.status}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {new Date(app.created_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' })}
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
                          onClick={() => handleReview(app.id, 'rejected')}
                          disabled={acting === app.id}
                          className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/5 disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleReview(app.id, 'approved')}
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
    </div>
  )
}
