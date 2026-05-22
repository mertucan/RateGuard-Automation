import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { getApplications, createApplication } from '../api'
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

export default function ApplicationsPage() {
  const { success: toastSuccess, error: toastError } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [applications, setApplications] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState('pending')
  const [form, setForm] = useState({
    target_company_id: '',
    target_department: 'sales',
    message: '',
  })

  const loadApps = useCallback(async () => {
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

  const loadCompanies = useCallback(async () => {
    try {
      // Fetch all companies (tenants) for the dropdown
      const res = await fetch('/api/companies?include_all=true', {
        headers: (() => {
          try {
            const u = JSON.parse(localStorage.getItem('rg_user') || 'null')
            if (u?.access_token) return { Authorization: `Bearer ${u.access_token}` }
            return u?.id ? { 'X-User-Id': u.id } : {}
          } catch { return {} }
        })(),
      })
      if (res.ok) {
        const data = await res.json()
        setCompanies(Array.isArray(data) ? data.filter(c => c.is_tenant) : [])
      }
    } catch (err) {
      console.error('Companies load error:', err)
    }
  }, [])

  useEffect(() => {
    loadApps()
    loadCompanies()
  }, [loadApps, loadCompanies])

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowForm(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.target_company_id) {
      toastError('Please select a company.')
      return
    }
    setSubmitting(true)
    try {
      await createApplication(form)
      toastSuccess('Application submitted! You will be notified once reviewed.')
      setShowForm(false)
      setForm({ target_company_id: '', target_department: 'sales', message: '' })
      await loadApps()
    } catch (err) {
      toastError(err.message || 'Failed to submit application.')
    } finally {
      setSubmitting(false)
    }
  }

  const counts = useMemo(() => ({
    all: applications.length,
    pending: applications.filter((app) => app.status === 'pending').length,
    approved: applications.filter((app) => app.status === 'approved').length,
    rejected: applications.filter((app) => app.status === 'rejected').length,
  }), [applications])

  const filteredApplications = useMemo(
    () => applications.filter((app) => filter === 'all' || app.status === filter),
    [applications, filter],
  )

  const inputCls = 'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary'

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-text">
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-4 sm:px-8 sm:py-5">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">Department Applications</h2>
          <p className="mt-1 hidden text-sm text-text-muted sm:block">
            Apply to join a company's Sales, Finance, or HR department.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-dark sm:px-4 sm:text-sm"
        >
          {showForm ? 'Cancel' : 'New Application'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-primary/20 bg-primary-soft p-4 sm:p-6 space-y-4"
            >
              <h3 className="text-lg font-bold">Apply to a Department</h3>
              <p className="text-sm text-text-muted">
                Select a company and department. The company HR team will review your application and
                may assign you to their team.
              </p>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">Company</label>
                <select
                  className={`${inputCls} rg-select`}
                  value={form.target_company_id}
                  onChange={(e) => setForm({ ...form, target_company_id: e.target.value })}
                  required
                >
                  <option value="">Select a company...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">Department</label>
                <select
                  className={`${inputCls} rg-select`}
                  value={form.target_department}
                  onChange={(e) => setForm({ ...form, target_department: e.target.value })}
                >
                  <option value="sales">Sales</option>
                  <option value="finance">Finance</option>
                  <option value="hr">HR</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
                  Message <span className="normal-case font-normal text-text-muted">(optional)</span>
                </label>
                <textarea
                  className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary h-28"
                  placeholder="Introduce yourself and explain why you'd like to join this department..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold transition-colors hover:bg-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.target_company_id}
                  className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          )}

          {!loading && applications.length > 0 && (
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
          )}

          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : applications.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-12 text-center">
              <span className="material-symbols-outlined mb-3 block text-4xl text-text-muted">work_outline</span>
              <p className="text-sm font-semibold text-text">No applications yet</p>
              <p className="mt-1 text-xs text-text-muted">
                Apply to join a company's department using the button above.
              </p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-12 text-center">
              <span className="material-symbols-outlined mb-3 block text-4xl text-text-muted">filter_list_off</span>
              <p className="text-sm font-semibold text-text">No {filter} applications</p>
              <p className="mt-1 text-xs text-text-muted">
                Try another status filter or create a new application.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-alt px-4 py-3 sm:px-6">
                <h3 className="text-sm font-semibold">My Applications</h3>
                <span className="text-xs font-medium text-text-muted">
                  {filteredApplications.length} shown
                </span>
              </div>
              <div className="divide-y divide-border">
                {filteredApplications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{app.company?.company_name || '—'}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                          {DEPT_LABELS[app.target_department] || app.target_department}
                        </span>
                      </div>
                      {app.message && (
                        <p className="mt-1 text-xs text-text-muted line-clamp-2">{app.message}</p>
                      )}
                      <p className="mt-1 text-[10px] text-text-muted">
                        {formatDisplayDate(app.created_at)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGES[app.status] || ''}`}>
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
