import { useEffect, useState, useCallback } from 'react'
import {
  getCompanies,
  deleteCompany,
  getRevenueAnalysis,
  getAutomationSettings,
  updateAutomationSettings,
  runRenewalAutomation,
} from '../api'
import Spinner from '../components/Spinner'
import { useAuth } from '../contexts/AuthContext'

function DeleteModal({ open, name, onConfirm, onCancel, loading }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
            <span className="material-symbols-outlined text-xl text-red-500">warning</span>
          </div>
          <div>
            <h3 className="text-lg font-bold">Remove company</h3>
            <p className="text-sm text-text-muted">Contracts with this company will be removed.</p>
          </div>
        </div>
        <p className="mb-4 text-sm text-text">
          Remove <strong>{name}</strong>? All contracts between your organization and this company will be deleted.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-hover">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50">
            {loading ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ClientManagementPage() {
  const { user } = useAuth()
  const currentYear = new Date().getFullYear()
  const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)
  const [reportPeriod, setReportPeriod] = useState('all')
  const [reportQuarter, setReportQuarter] = useState(currentQuarter)
  const [reportYear, setReportYear] = useState(currentYear)
  const [report, setReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(true)
  const [automationLoading, setAutomationLoading] = useState(false)
  const [automationSaving, setAutomationSaving] = useState(false)
  const [automationRunning, setAutomationRunning] = useState(false)
  const [automationSettings, setAutomationSettings] = useState({
    auto_renewal_enabled: false,
    require_admin_approval_before_auto_renew: true,
    automation_email_enabled: true,
  })

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCompanies()
      setClients(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Companies load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadReport = useCallback(async () => {
    setReportLoading(true)
    try {
      const params = {
        period: reportPeriod === 'quarter' || reportPeriod === 'month' ? reportPeriod : 'all',
      }
      if (params.period === 'quarter') {
        params.quarter = reportQuarter
        params.year = reportYear
      }
      if (user?.role === 'company_admin' && user?.company_id) {
        params.tenant_company_id = user.company_id
      }
      const data = await getRevenueAnalysis(params)
      setReport(data)
    } catch (err) {
      console.error('Revenue report error:', err)
      setReport(null)
    } finally {
      setReportLoading(false)
    }
  }, [reportPeriod, reportQuarter, reportYear, user?.role, user?.company_id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  useEffect(() => {
    if (!['company_admin', 'super_admin'].includes(user?.role)) return
    setAutomationLoading(true)
    getAutomationSettings(user?.role === 'super_admin' ? '' : user?.company_id)
      .then((data) => {
        setAutomationSettings({
          auto_renewal_enabled: !!data?.auto_renewal_enabled,
          require_admin_approval_before_auto_renew: !!data?.require_admin_approval_before_auto_renew,
          automation_email_enabled: !!data?.automation_email_enabled,
        })
      })
      .catch((err) => {
        console.error('Automation settings load error:', err)
        showToast('Could not load automation settings', 'error')
      })
      .finally(() => setAutomationLoading(false))
  }, [user?.role, user?.company_id])

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCompany(deleteTarget.id)
      setDeleteTarget(null)
      showToast('Company removed and contracts deleted')
      await load()
    } catch (err) {
      console.error('Delete error:', err)
      showToast('Delete failed: ' + err.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  const formatCurrency = (n) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n || 0)

  const formatShortDate = (iso) => {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
    } catch {
      return iso
    }
  }

  const saveAutomationSettings = async () => {
    setAutomationSaving(true)
    try {
      await updateAutomationSettings({
        ...automationSettings,
        company_id: user?.company_id,
      })
      showToast('Automation settings saved')
    } catch (err) {
      showToast(`Could not save settings: ${err.message}`, 'error')
    } finally {
      setAutomationSaving(false)
    }
  }

  const runAutomationNow = async () => {
    setAutomationRunning(true)
    try {
      const res = await runRenewalAutomation()
      showToast(
        `Done: checked ${res.checked}, new periods ${res.renewed_created || 0}, pending admin approval ${res.pending_admin_approval}, emails sent ${res.emails_sent}`,
      )
      await loadReport()
    } catch (err) {
      showToast(`Automation failed: ${err.message}`, 'error')
    } finally {
      setAutomationRunning(false)
    }
  }

  const copyReportSummary = () => {
    if (!report) return
    const p = report.portfolio || {}
    const a = report.period_activity || {}
    const lines = [
      `RateGuard revenue analysis (${report.period_label})`,
      `Total contract value: ${formatCurrency(p.total_value_try)}`,
      `Contract count: ${p.total_contracts} (active pipeline: ${p.active_pipeline_contracts})`,
      `Average estimated increase: ${p.avg_estimated_increase_pct}%`,
      `Estimated renewal uplift (TRY): ${formatCurrency(p.estimated_renewal_uplift_try)}`,
      `Period activity: ${a.new_contracts} new contracts, ${a.client_approved} client approvals, ${a.expirations_in_range} end dates`,
    ]
    navigator.clipboard.writeText(lines.join('\n')).then(() => showToast('Copied the summary')).catch(() => showToast('Could not copy the summary', 'error'))
  }

  const quarterOptions = [1, 2, 3, 4]

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-text">
      {/* Toast */}
      {toast && (
        <div className={`fixed right-6 top-20 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        }`}>
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Delete Modal */}
      <DeleteModal
        open={!!deleteTarget}
        name={deleteTarget?.company_name || ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <header className="flex shrink-0 flex-col gap-3 border-b border-border bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-5">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold sm:text-2xl">Client Management</h2>
          <p className="mt-1 hidden text-sm text-text-muted sm:block">
            Companies you have active contracts with. Remove a company to delete all contracts between you.
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        {['company_admin', 'super_admin'].includes(user?.role) && (
          <section className="mb-8 rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-text">Company Admin - Renewal Automation</h3>
              <p className="mt-1 text-sm text-text-muted">
                Company admins control whether eligible contracts can renew automatically. Individual contracts
                must also have automatic renewal enabled, so teams can opt in contract by contract.
              </p>
            </div>
            {automationLoading ? (
              <div className="py-4"><Spinner size="md" /></div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <input
                    type="checkbox"
                    checked={automationSettings.auto_renewal_enabled}
                    onChange={(e) =>
                      setAutomationSettings((prev) => ({
                        ...prev,
                        auto_renewal_enabled: e.target.checked,
                      }))
                    }
                  />
                  <span className="text-sm font-medium">
                    Enable automatic renewal for eligible contracts
                  </span>
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <input
                    type="checkbox"
                    checked={automationSettings.require_admin_approval_before_auto_renew}
                    onChange={(e) =>
                      setAutomationSettings((prev) => ({
                        ...prev,
                        require_admin_approval_before_auto_renew: e.target.checked,
                      }))
                    }
                  />
                  <span className="text-sm font-medium">
                    Require company admin approval before automated renewal
                  </span>
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <input
                    type="checkbox"
                    checked={automationSettings.automation_email_enabled}
                    onChange={(e) =>
                      setAutomationSettings((prev) => ({
                        ...prev,
                        automation_email_enabled: e.target.checked,
                      }))
                    }
                  />
                  <span className="text-sm font-medium">
                    Send automation notification emails (to your account email)
                  </span>
                </label>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={automationSaving || automationLoading}
                onClick={saveAutomationSettings}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {automationSaving ? 'Saving…' : 'Save settings'}
              </button>
              <button
                type="button"
                disabled={automationRunning}
                onClick={runAutomationNow}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-hover disabled:opacity-50"
              >
                {automationRunning ? 'Running…' : 'Run automation now'}
              </button>
              <p className="w-full text-xs text-text-muted">
                Backend approval actions: Approve · Reject · Send back for revision. Decisions are stored in approval
                logs.
              </p>
            </div>
          </section>
        )}

        {/* Revenue analysis - calendar-based monthly or quarterly snapshot */}
        <section className="mb-8 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border bg-gradient-to-br from-primary/10 via-surface to-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h3 className="text-lg font-bold text-text">Revenue & renewal analysis</h3>
              <p className="mt-1 text-sm text-text-muted">
                Automatic snapshot by calendar period using Supabase contract dates and TCMB rules for estimates.
              </p>
              {report?.generated_at && (
                <p className="mt-1 text-xs text-text-muted">
                  Generated: {formatShortDate(report.generated_at)}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setReportPeriod('all')}
                  className={`rounded-md px-3 py-1.5 transition-colors ${reportPeriod === 'all' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:bg-hover'}`}
                >
                  All time
                </button>
                <button
                  type="button"
                  onClick={() => setReportPeriod('month')}
                  className={`rounded-md px-3 py-1.5 transition-colors ${reportPeriod === 'month' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:bg-hover'}`}
                >
                  This month
                </button>
                {quarterOptions.map((quarter) => (
                  <button
                    key={quarter}
                    type="button"
                    onClick={() => {
                      setReportPeriod('quarter')
                      setReportQuarter(quarter)
                    }}
                    className={`rounded-md px-3 py-1.5 transition-colors ${
                      reportPeriod === 'quarter' && reportQuarter === quarter
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-text-muted hover:bg-hover'
                    }`}
                  >
                    Q{quarter}
                  </button>
                ))}
              </div>
              {reportPeriod === 'quarter' && (
                <label className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-muted">
                  Year
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={reportYear}
                    onChange={(e) => setReportYear(Number(e.target.value) || currentYear)}
                    className="w-20 bg-transparent text-text outline-none"
                  />
                </label>
              )}
              <button
                type="button"
                onClick={copyReportSummary}
                disabled={!report}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:bg-hover hover:text-text disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-base">content_copy</span>
                Copy summary
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {reportLoading ? (
              <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : !report ? (
              <p className="text-center text-sm text-text-muted">Report could not be loaded.</p>
            ) : (
              <>
                <p className="mb-4 text-center text-sm font-medium text-primary sm:text-left">
                  {report.period_label}
                  {report.market && (
                    <span className="ml-2 text-text-muted">
                      | TUFE %{report.market.tufe} | UFE %{report.market.ufe}
                    </span>
                  )}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-border bg-surface-alt p-4">
                    <p className="text-xs font-medium text-text-muted">Total contract value</p>
                    <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(report.portfolio?.total_value_try)}</p>
                    <p className="mt-1 text-[11px] text-text-muted">{report.portfolio?.total_contracts} contracts (excl. rejected)</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface-alt p-4">
                    <p className="text-xs font-medium text-text-muted">Active renewal pipeline</p>
                    <p className="mt-1 text-xl font-bold tabular-nums">{report.portfolio?.active_pipeline_contracts ?? '-'}</p>
                    <p className="mt-1 text-[11px] text-text-muted">Not finalized (approved/rejected)</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface-alt p-4">
                    <p className="text-xs font-medium text-text-muted">Avg. estimated increase</p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                      %{report.portfolio?.avg_estimated_increase_pct ?? '-'}
                    </p>
                    <p className="mt-1 text-[11px] text-text-muted">From rules & caps vs. last amounts</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface-alt p-4">
                    <p className="text-xs font-medium text-text-muted">Est. renewal uplift</p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(report.portfolio?.estimated_renewal_uplift_try)}
                    </p>
                    <p className="mt-1 text-[11px] text-text-muted">Sum of modeled increases</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm">
                    <span className="font-semibold text-text">{report.period_activity?.new_contracts ?? 0}</span>
                    <span className="text-text-muted"> new contracts in period</span>
                  </div>
                  <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm">
                    <span className="font-semibold text-text">{report.period_activity?.client_approved ?? 0}</span>
                    <span className="text-text-muted"> client-approved in period</span>
                  </div>
                  <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm">
                    <span className="font-semibold text-text">{report.period_activity?.expirations_in_range ?? 0}</span>
                    <span className="text-text-muted"> end dates in period</span>
                  </div>
                </div>

                {Array.isArray(report.top_clients_by_value) && report.top_clients_by_value.length > 0 && (
                  <div className="mt-6">
                    <h4 className="mb-2 text-sm font-bold">Top clients by booked value</h4>
                    <ul className="divide-y divide-border rounded-xl border border-border">
                      {report.top_clients_by_value.map((row) => (
                        <li key={String(row.company_id ?? row.company_name)} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                          <span className="min-w-0 truncate font-medium">{row.company_name}</span>
                          <span className="shrink-0 tabular-nums text-text-muted">
                            {formatCurrency(row.value)}
                            <span className="ml-1 text-xs">| {row.contract_count} ct.</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-surface-alt text-xs font-semibold uppercase tracking-wider text-text-muted">
                    <th className="px-4 py-3 sm:px-6 sm:py-4">Company Name</th>
                    <th className="hidden px-4 py-3 sm:table-cell sm:px-6 sm:py-4">Contact</th>
                    <th className="hidden px-4 py-3 md:table-cell sm:px-6 sm:py-4">Contract Value</th>
                    <th className="px-4 py-3 text-right sm:px-6 sm:py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-sm text-text-muted">
                        <span className="material-symbols-outlined mb-2 block text-3xl">business</span>
                        No companies found. Create a contract on the <strong className="text-text">Contracts</strong> page to see companies here.
                      </td>
                    </tr>
                  )}
                  {clients.map((c) => (
                    <tr className="transition-colors hover:bg-hover" key={c.id}>
                      <td className="px-4 py-3 font-medium sm:px-6 sm:py-4">
                        <div className="flex items-center gap-3">
                          <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary sm:flex">
                            {(c.company_name || '?')[0].toUpperCase()}
                          </div>
                          <span className="min-w-0 truncate">{c.company_name}</span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-text-muted sm:table-cell sm:px-6 sm:py-4">{c.authorized_email}</td>
                      <td className="hidden px-4 py-3 text-sm font-medium md:table-cell sm:px-6 sm:py-4">{formatCurrency(c.contract_value)}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium sm:px-6 sm:py-4">
                        <button type="button" onClick={() => setDeleteTarget(c)} className="text-red-500 hover:text-red-400 font-medium">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
