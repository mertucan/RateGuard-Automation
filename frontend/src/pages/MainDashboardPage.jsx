import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getDashboardStats, getContracts } from '../api'
import { PageLoader } from '../components/Spinner'
import ContractExpiryCalendar from '../components/ContractExpiryCalendar'

export default function MainDashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [calendarDay, setCalendarDay] = useState(null)

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

  const upcomingFiltered = useMemo(() => {
    const list = [...(stats?.expiring_calendar || [])]
    if (!calendarDay) return list.slice(0, 12)
    return list.filter((r) => (r.end_date || '').slice(0, 10) === calendarDay)
  }, [stats, calendarDay])

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
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-gradient-to-r from-surface via-surface to-primary/5 px-4 py-4 sm:px-8 sm:py-5">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold sm:text-2xl">
            {role === 'client' ? 'My Contracts' : 'Dashboard'}
          </h2>
          <p className="mt-1 hidden text-sm text-text-muted sm:block">
            Welcome back, {user?.full_name || 'User'}
            <span className="ml-2 inline-flex items-center rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
              {ROLE_LABEL[role] || role}
            </span>
          </p>
        </div>
        {canCreateContract && (
          <button
            onClick={() => navigate('/renewal-review')}
            className="shrink-0 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-md shadow-primary/25 transition-colors hover:bg-primary-dark sm:text-sm"
          >
            New contract
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto w-full max-w-6xl space-y-6 sm:space-y-8">
          {/* Quick links */}
          {(showRenewals || role === 'client') && (
            <nav className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate('/renewal-review')}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text shadow-sm transition-colors hover:border-primary/40 hover:bg-primary-soft"
              >
                <span className="material-symbols-outlined text-primary text-[20px]">description</span>
                Contracts
              </button>
              {['super_admin', 'company_admin'].includes(role) && (
                <button
                  type="button"
                  onClick={() => navigate('/clients')}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text shadow-sm transition-colors hover:border-primary/40 hover:bg-primary-soft"
                >
                  <span className="material-symbols-outlined text-primary text-[20px]">group</span>
                  Clients
                </button>
              )}
              {['super_admin', 'company_admin', 'finance', 'user', 'client'].includes(role) && (
                <button
                  type="button"
                  onClick={() => navigate('/analytics')}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text shadow-sm transition-colors hover:border-primary/40 hover:bg-primary-soft"
                >
                  <span className="material-symbols-outlined text-primary text-[20px]">monitoring</span>
                  Analytics
                </button>
              )}
            </nav>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-text-muted">Expiring (30d)</p>
                <span className="material-symbols-outlined rounded-lg bg-amber-500/15 p-1.5 text-amber-600 text-[22px]">event_upcoming</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">{stats?.expiring_30 ?? '\u2014'}</p>
              <p className="mt-2 text-xs text-text-muted">Needs review soon</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-text-muted">Pending approvals</p>
                <span className="material-symbols-outlined rounded-lg bg-primary/15 p-1.5 text-primary text-[22px]">pending_actions</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">{stats?.pending_approvals ?? '\u2014'}</p>
              <p className="mt-2 text-xs text-text-muted">Due within 60 days</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-text-muted">Portfolio (active)</p>
                <span className="material-symbols-outlined rounded-lg bg-emerald-500/15 p-1.5 text-emerald-600 text-[22px]">account_balance</span>
              </div>
              <p className="mt-2 text-lg font-bold tabular-nums sm:text-2xl">
                {stats?.total_portfolio_value_try != null
                  ? formatCurrency(stats.total_portfolio_value_try)
                  : '\u2014'}
              </p>
              <p className="mt-2 text-xs text-text-muted">
                {stats?.active_contracts_count != null
                  ? `${stats.active_contracts_count} open contracts`
                  : 'Booked value excl. finalized'}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-text-muted">Avg. adjustment</p>
                <span className="material-symbols-outlined rounded-lg bg-violet-500/15 p-1.5 text-violet-600 text-[22px]">percent</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">{avgAdj}%</p>
              <p className="mt-2 text-xs text-text-muted">Blended TUFE / UFE (TCMB)</p>
            </div>
          </div>

          {/* Contract expiry calendar (next 120 days) */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            <ContractExpiryCalendar
              events={stats?.expiring_calendar || []}
              selectedDay={calendarDay}
              onDaySelect={setCalendarDay}
            />
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold">Upcoming expirations</h3>
                  <p className="mt-1 text-sm text-text-muted">
                    {calendarDay
                      ? `Ending on ${calendarDay}`
                      : 'Next due dates in the following 120 days.'}
                  </p>
                </div>
                {calendarDay && (
                  <button
                    type="button"
                    onClick={() => setCalendarDay(null)}
                    className="shrink-0 rounded-lg border border-border px-3 py-1 text-xs font-semibold text-text-muted transition-colors hover:bg-hover hover:text-text"
                  >
                    Clear day
                  </button>
                )}
              </div>
              <ul className="max-h-64 space-y-2 overflow-y-auto sm:max-h-80">
                {upcomingFiltered.length === 0 ? (
                  <li className="rounded-lg border border-border bg-surface-alt px-4 py-6 text-center text-sm text-text-muted">
                    No contracts in this view.
                  </li>
                ) : (
                  upcomingFiltered.map((item) => {
                    const d = item.days_until
                    const cls =
                      d != null && d <= 7
                        ? 'border-red-500/30 bg-red-500/5'
                        : d != null && d <= 30
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : 'border-border bg-surface-alt'
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/renewal-review/${item.id}`)}
                          className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-hover ${cls}`}
                        >
                          <span className="min-w-0 truncate text-sm font-medium">
                            {item.company_name}
                          </span>
                          <span className="shrink-0 text-xs text-text-muted">
                            {item.end_date}
                            {d != null ? (
                              <span
                                className={
                                  d < 0
                                    ? 'ml-1 font-semibold text-red-500'
                                    : d <= 30
                                      ? 'ml-1 font-semibold text-amber-600'
                                      : 'ml-1 text-emerald-600'
                                }
                              >
                                ({d}d)
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    )
                  })
                )}
              </ul>
            </div>
          </section>

          {/* Market Data + Alerts (visible to admin/finance roles) */}
          {showMarket && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 sm:gap-6">
              <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6 lg:col-span-2">
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

              <section className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary-soft to-surface p-4 shadow-sm sm:p-6">
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
            <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
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
            <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
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
