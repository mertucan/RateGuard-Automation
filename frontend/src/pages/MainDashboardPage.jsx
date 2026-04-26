import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getDashboardStats, getContracts } from '../api'
import { PageLoader } from '../components/Spinner'

export default function MainDashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const params = {}
        if (user?.role === 'company_admin' && user?.company_id) {
          params.tenant_company_id = user.company_id
        }
        
        const [s, c] = await Promise.all([
          getDashboardStats(params),
          getContracts({ pending: 'true', ...params }),
        ])
        setStats(s)
        const pending = (c || []).filter((ct) => {
          const st = ct.status || 'active'
          return st !== 'approved' && st !== 'rejected'
        })
        setRows(pending)
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const initials = (name) =>
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  const formatCurrency = (n) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

  const calcNewPrice = (amount, rule, tufe, ufe) => {
    let adj = 0
    if (rule === 'TUFE') adj = tufe
    else if (rule === 'UFE') adj = ufe
    else adj = (tufe + ufe) / 2
    return amount * (1 + adj / 100)
  }

  if (loading) return <PageLoader />

  const tufe = stats?.tufe || 0
  const ufe = stats?.ufe || 0
  const avgAdj = stats?.avg_adjustment || 0

  const ROLE_LABEL = {
    super_admin: 'Super Admin',
    company_admin: 'Company Admin',
    finance: 'Finance Department',
    sales: 'Sales Representative',
    client: 'Client',
  }

  const role = user?.role || 'client'
  const showMarket = ['super_admin', 'company_admin', 'finance'].includes(role)
  const showRenewals = ['super_admin', 'company_admin', 'finance', 'sales'].includes(role)
  const canCreateContract = ['super_admin', 'company_admin', 'sales'].includes(role)

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-text">
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-4 sm:px-8 sm:py-5">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold sm:text-2xl">
            {role === 'client' ? 'My Contracts' : 'Dashboard Overview'}
          </h2>
          <p className="mt-1 hidden text-sm text-text-muted sm:block">
            Welcome, {user?.full_name || 'User'}
            <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
              {ROLE_LABEL[role] || role}
            </span>
          </p>
        </div>
        {canCreateContract && (
          <button
            onClick={() => navigate('/renewal-review')}
            className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-dark sm:px-4 sm:text-sm"
          >
            New Contract
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="space-y-6 sm:space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 sm:gap-6">
            <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
              <p className="text-sm font-medium text-text-muted">Expiring in 30 Days</p>
              <p className="mt-1 text-2xl font-bold sm:text-3xl">{stats?.expiring_30 ?? '\u2014'}</p>
              <p className="mt-2 text-xs text-text-muted">Contracts need urgent review</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
              <p className="text-sm font-medium text-text-muted">Pending Approvals</p>
              <p className="mt-1 text-2xl font-bold sm:text-3xl">
                {stats?.pending_approvals ?? '\u2014'}
              </p>
              <p className="mt-2 text-xs text-text-muted">Expiring within 60 days</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
              <p className="text-sm font-medium text-text-muted">Avg Inflation Adjustment</p>
              <p className="mt-1 text-2xl font-bold sm:text-3xl">{avgAdj}%</p>
              <p className="mt-2 text-xs text-text-muted">Based on TUFE (CPI) and UFE (PPI) rates from TCMB</p>
            </div>
          </div>

          {/* Market Data + Alerts (visible to admin/finance roles) */}
          {showMarket && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 sm:gap-8">
              <section className="rounded-xl border border-border bg-surface p-4 sm:p-6 lg:col-span-2">
                <h3 className="text-lg font-bold">Market Snapshot</h3>
                <p className="text-sm text-text-muted">Live data from TCMB (Central Bank of Turkey) EVDS API. Rates are updated daily.</p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 md:grid-cols-4">
                  <div className="rounded-lg border border-border bg-surface-alt p-3 text-center sm:p-4">
                    <p className="text-xs font-medium text-text-muted">USD/TRY</p>
                    <p className="mt-1 text-xl font-bold sm:text-2xl">
                      {stats?.usd ? stats.usd.toFixed(2) : '\u2014'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-alt p-3 text-center sm:p-4">
                    <p className="text-xs font-medium text-text-muted">EUR/TRY</p>
                    <p className="mt-1 text-xl font-bold sm:text-2xl">
                      {stats?.eur ? stats.eur.toFixed(2) : '\u2014'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-alt p-3 text-center sm:p-4">
                    <p className="text-xs font-medium text-text-muted">TUFE (YoY)</p>
                    <p className="mt-1 text-xl font-bold text-amber-500 sm:text-2xl">
                      %{tufe.toFixed(1)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-alt p-3 text-center sm:p-4">
                    <p className="text-xs font-medium text-text-muted">UFE (YoY)</p>
                    <p className="mt-1 text-xl font-bold text-amber-500 sm:text-2xl">
                      %{ufe.toFixed(1)}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-primary/20 bg-primary-soft p-4 sm:p-6">
                <h3 className="text-lg font-bold text-primary">Market Alerts</h3>
                <div className="mt-4 space-y-3">
                  {tufe > 40 && (
                    <div className="rounded-lg border border-border bg-surface p-4">
                      <p className="text-sm font-semibold">High CPI Alert</p>
                      <p className="mt-1 text-xs text-text-muted">
                        TUFE is at %{tufe.toFixed(1)} - contract adjustments may be significant.
                      </p>
                    </div>
                  )}
                  {stats?.usd > 35 && (
                    <div className="rounded-lg border border-border bg-surface p-4">
                      <p className="text-sm font-semibold">Exchange Rate Warning</p>
                      <p className="mt-1 text-xs text-text-muted">
                        USD/TRY is at {stats.usd.toFixed(2)} - review FX-linked contracts.
                      </p>
                    </div>
                  )}
                  {tufe <= 40 && (!stats?.usd || stats.usd <= 35) && (
                    <div className="rounded-lg border border-border bg-surface p-4">
                      <p className="text-sm font-semibold">All Clear</p>
                      <p className="mt-1 text-xs text-text-muted">
                        No critical market alerts at this time.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* Pending Renewals Table */}
          {showRenewals && (
            <section className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="border-b border-border p-4 sm:p-6">
                <h3 className="text-lg font-bold">Pending Renewals</h3>
                <p className="mt-1 text-sm text-text-muted">
                  Contracts requiring attention based on EVDS data.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-surface-alt">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted sm:px-6 sm:py-4">
                        Client Name
                      </th>
                      <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted sm:table-cell sm:px-6 sm:py-4">
                        End Date
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted sm:px-6 sm:py-4">
                        Current Price
                      </th>
                      <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted md:table-cell sm:px-6 sm:py-4">
                        Calc. New Price
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted sm:px-6 sm:py-4">
                        Adj.
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted sm:px-6 sm:py-4">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-sm text-text-muted">
                          No pending renewals found.
                        </td>
                      </tr>
                    )}
                    {rows.map((row) => {
                      const companyName = row.companies?.company_name || '\u2014'
                      const amount = row.previous_amount || 0
                      const rule = row.inflation_base_rule || 'TUFE'
                      const newPrice = calcNewPrice(amount, rule, tufe, ufe)
                      const adjPct =
                        amount > 0 ? (((newPrice - amount) / amount) * 100).toFixed(1) : '0'

                      return (
                        <tr className="transition-colors hover:bg-hover" key={row.id}>
                          <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                            <div className="flex items-center gap-3">
                              <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary sm:flex">
                                {initials(companyName)}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{companyName}</p>
                                <p className="text-xs text-text-muted">{rule}</p>
                              </div>
                            </div>
                          </td>
                          <td className="hidden whitespace-nowrap px-4 py-3 text-sm sm:table-cell sm:px-6 sm:py-4">
                            {row.end_date || '\u2014'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm sm:px-6 sm:py-4">
                            {formatCurrency(amount)}
                          </td>
                          <td className="hidden whitespace-nowrap px-4 py-3 text-sm font-bold md:table-cell sm:px-6 sm:py-4">
                            {formatCurrency(newPrice)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-amber-500 sm:px-6 sm:py-4">
                            +{adjPct}%
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6 sm:py-4">
                            <button
                              onClick={() => navigate(`/renewal-review/${row.id}`)}
                              className="rounded border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary-soft sm:text-sm"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Client role: simplified view */}
          {role === 'client' && (
            <section className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="border-b border-border p-4 sm:p-6">
                <h3 className="text-lg font-bold">Your Contracts</h3>
                <p className="mt-1 text-sm text-text-muted">
                  View and manage your active contracts.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-surface-alt">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted sm:px-6 sm:py-4">
                        Contract
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted sm:px-6 sm:py-4">
                        Amount
                      </th>
                      <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted sm:table-cell sm:px-6 sm:py-4">
                        End Date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted sm:px-6 sm:py-4">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-sm text-text-muted">
                          No active contracts found.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr className="transition-colors hover:bg-hover" key={row.id}>
                          <td className="px-4 py-3 sm:px-6 sm:py-4">
                            <p className="text-sm font-medium">
                              {row.companies?.company_name || 'Contract'}
                            </p>
                            <p className="text-xs text-text-muted">ID: {row.id.slice(0, 8)}</p>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold sm:px-6 sm:py-4">
                            {formatCurrency(row.previous_amount || 0)}
                          </td>
                          <td className="hidden px-4 py-3 text-sm sm:table-cell sm:px-6 sm:py-4">
                            {row.end_date || '\u2014'}
                          </td>
                          <td className="px-4 py-3 text-right sm:px-6 sm:py-4">
                            <button
                              onClick={() => navigate(`/renewal-review/${row.id}`)}
                              className="rounded border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
