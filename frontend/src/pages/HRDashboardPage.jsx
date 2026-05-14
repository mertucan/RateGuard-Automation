import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApplications } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { PageLoader } from '../components/Spinner'

const DEPT_LABELS = { sales: 'Sales', finance: 'Finance', hr: 'HR' }
const STATUS_BADGES = {
  pending: 'bg-amber-500/10 text-amber-500',
  approved: 'bg-emerald-500/10 text-emerald-500',
  rejected: 'bg-red-500/10 text-red-500',
}

export default function HRDashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await getApplications()
        setApplications(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('HR dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const counts = useMemo(() => {
    const base = { all: applications.length, pending: 0, approved: 0, rejected: 0 }
    for (const app of applications) {
      if (base[app.status] != null) base[app.status] += 1
    }
    return base
  }, [applications])

  const recent = applications.slice(0, 6)
  const approvalRate = counts.all ? Math.round((counts.approved / counts.all) * 100) : 0

  if (loading) return <PageLoader />

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-text">
      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-border bg-surface">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                  <span className="material-symbols-outlined text-[16px]">badge</span>
                  HR
                </span>
                <h2 className="headline-font mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  HR Dashboard
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                  Welcome back, {user?.full_name || 'HR user'}. Track and process applications submitted to your assigned company.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/application-management')}
                className="inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-colors hover:bg-primary-dark"
              >
                <span className="material-symbols-outlined text-[20px]">assignment_ind</span>
                Review applications
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-5 sm:px-8 sm:py-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <p className="text-sm font-medium text-text-muted">Pending</p>
              <p className="mt-2 text-3xl font-extrabold tabular-nums">{counts.pending}</p>
              <p className="mt-2 text-xs text-text-muted">Awaiting HR decision</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <p className="text-sm font-medium text-text-muted">Approved</p>
              <p className="mt-2 text-3xl font-extrabold tabular-nums">{counts.approved}</p>
              <p className="mt-2 text-xs text-text-muted">Assigned to departments</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <p className="text-sm font-medium text-text-muted">Rejected</p>
              <p className="mt-2 text-3xl font-extrabold tabular-nums">{counts.rejected}</p>
              <p className="mt-2 text-xs text-text-muted">Closed applications</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-text-muted">Approval rate</p>
                  <p className="mt-2 text-3xl font-extrabold tabular-nums">{approvalRate}%</p>
                </div>
                <span className="material-symbols-outlined rounded-lg bg-emerald-500/10 p-2 text-emerald-500 text-[24px]">trending_up</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${approvalRate}%` }} />
              </div>
            </div>
          </div>

          <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
              <div>
                <h3 className="text-lg font-bold">Recent applications</h3>
                <p className="mt-1 text-sm text-text-muted">Only applications submitted to your assigned company are shown.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/application-management')}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:bg-hover hover:text-text"
              >
                View all
              </button>
            </div>

            {recent.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <span className="material-symbols-outlined mb-3 block text-4xl text-text-muted">inbox</span>
                <p className="text-sm font-semibold">No applications yet</p>
                <p className="mt-1 text-xs text-text-muted">New company applications will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recent.map((app) => (
                  <div key={app.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{app.applicant?.full_name || 'Applicant'}</p>
                      <p className="mt-0.5 truncate text-xs text-text-muted">{app.applicant?.email || 'No email'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                        {DEPT_LABELS[app.target_department] || app.target_department}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_BADGES[app.status] || ''}`}>
                        {app.status}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {new Date(app.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
