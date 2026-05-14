import { useEffect, useState, useMemo, useRef } from 'react'
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
  const calendarBoxRef = useRef(null)
  const [calendarBoxHeight, setCalendarBoxHeight] = useState(null)
  const [isLg, setIsLg] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(min-width: 1024px)')
    const onChange = () => setIsLg(!!mql.matches)
    onChange()
    if (mql.addEventListener) mql.addEventListener('change', onChange)
    else mql.addListener(onChange)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange)
      else mql.removeListener(onChange)
    }
  }, [])

  useEffect(() => {
    const el = calendarBoxRef.current
    if (!el || typeof ResizeObserver === 'undefined') return

    const updateHeight = () => {
      const h = el.getBoundingClientRect?.().height
      if (h) setCalendarBoxHeight(Math.round(h))
    }
    updateHeight()

    const ro = new ResizeObserver(updateHeight)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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

  const calcNewPrice = (amount, rule, tufe, ufe, maxLimit) => {
    let adj = 0
    const maxLimitNum = maxLimit !== null && maxLimit !== undefined && maxLimit !== '' ? Number(maxLimit) : null
    if (rule === 'CUSTOM') adj = maxLimitNum || 0
    else if (rule === 'TUFE') adj = tufe
    else if (rule === 'UFE') adj = ufe
    else adj = (tufe + ufe) / 2
    if (rule !== 'CUSTOM' && maxLimitNum !== null && adj > maxLimitNum) adj = maxLimitNum
    return amount * (1 + adj / 100)
  }

  const upcomingFiltered = useMemo(() => {
    const list = [...(stats?.expiring_calendar || [])]
    if (!calendarDay) return list.slice(0, 12)
    return list.filter((r) => (r.end_date || '').slice(0, 10) === calendarDay)
  }, [stats, calendarDay])

  const urgentExpirations = useMemo(() => {
    return [...(stats?.expiring_calendar || [])]
      .filter((item) => item.days_until != null && item.days_until <= 30)
      .sort((a, b) => (a.days_until ?? 999) - (b.days_until ?? 999))
      .slice(0, 3)
  }, [stats])

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

  const activeCount = stats?.active_contracts_count ?? 0
  const expiringCount = stats?.expiring_30 ?? 0
  const pendingCount = stats?.pending_approvals ?? 0
  const portfolioValue = stats?.total_portfolio_value_try
  const actionLoad = Math.min(100, activeCount ? Math.round(((expiringCount + pendingCount) / activeCount) * 100) : 0)

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-text">
      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-border bg-surface">
          <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-8 sm:py-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                    <span className="material-symbols-outlined text-[16px]">verified_user</span>
                    {ROLE_LABEL[role] || role}
                  </span>
                  <span className="text-xs font-medium text-text-muted">
                    {new Date().toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <h2 className="headline-font truncate text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {role === 'client' ? 'My Contracts' : 'Renewal Command Center'}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                  Welcome back, {user?.full_name || 'User'}. Monitor contract deadlines,
                  approval load, and market signals from one focused workspace.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {(showRenewals || role === 'client') && (
                  <button
                    type="button"
                    onClick={() => navigate('/renewal-review')}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface-alt px-3.5 text-sm font-semibold text-text transition-colors hover:border-primary/40 hover:bg-primary-soft"
                  >
                    <span className="material-symbols-outlined text-primary text-[20px]">description</span>
                    Contracts
                  </button>
                )}
                {canCreateContract && (
                  <button
                    onClick={() => navigate('/renewal-review')}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-colors hover:bg-primary-dark"
                  >
                    <span className="material-symbols-outlined text-[20px]">add_circle</span>
                    New contract
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="rounded-xl border border-border bg-surface-alt p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Attention load</p>
                    <p className="mt-1 text-sm text-text-muted">{expiringCount + pendingCount} items need review</p>
                  </div>
                  <p className="text-2xl font-extrabold tabular-nums text-primary">{actionLoad}%</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${actionLoad}%` }} />
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface-alt p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Portfolio value</p>
                <p className="mt-1 truncate text-xl font-extrabold tabular-nums">
                  {portfolioValue != null ? formatCurrency(portfolioValue) : '\u2014'}
                </p>
                <p className="mt-1 text-xs text-text-muted">{activeCount || '\u2014'} active contracts tracked</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-alt p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Market pulse</p>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-xl font-extrabold tabular-nums">%{tufe.toFixed(1)}</span>
                  <span className="text-sm font-semibold text-text-muted">TUFE</span>
                  <span className="text-xl font-extrabold tabular-nums">%{ufe.toFixed(1)}</span>
                  <span className="text-sm font-semibold text-text-muted">UFE</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-5 sm:px-8 sm:py-8">
          {/* Quick links */}
          {(showRenewals || role === 'client') && (
            <nav className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => navigate('/renewal-review')}
                className="flex min-h-16 items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary-soft"
              >
                <span>
                  <span className="block text-sm font-bold">Contracts</span>
                  <span className="mt-0.5 block text-xs text-text-muted">Review renewals and drafts</span>
                </span>
                <span className="material-symbols-outlined text-primary text-[22px]">description</span>
              </button>
              {['super_admin', 'company_admin'].includes(role) && (
                <button
                  type="button"
                  onClick={() => navigate('/clients')}
                  className="flex min-h-16 items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary-soft"
                >
                  <span>
                    <span className="block text-sm font-bold">Clients</span>
                    <span className="mt-0.5 block text-xs text-text-muted">Manage counterparties</span>
                  </span>
                  <span className="material-symbols-outlined text-primary text-[22px]">group</span>
                </button>
              )}
              {['super_admin', 'company_admin', 'finance', 'user', 'client'].includes(role) && (
                <button
                  type="button"
                  onClick={() => navigate('/analytics')}
                  className="flex min-h-16 items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary-soft"
                >
                  <span>
                    <span className="block text-sm font-bold">Analytics</span>
                    <span className="mt-0.5 block text-xs text-text-muted">Track revenue impact</span>
                  </span>
                  <span className="material-symbols-outlined text-primary text-[22px]">monitoring</span>
                </button>
              )}
            </nav>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-text-muted">Expiring (30d)</p>
                <span className="material-symbols-outlined rounded-lg bg-amber-500/15 p-1.5 text-amber-600 text-[22px]">event_upcoming</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">{stats?.expiring_30 ?? '\u2014'}</p>
              <p className="mt-2 text-xs text-text-muted">Contracts ending within 30 days</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-text-muted">Pending approvals</p>
                <span className="material-symbols-outlined rounded-lg bg-primary/15 p-1.5 text-primary text-[22px]">pending_actions</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">{stats?.pending_approvals ?? '\u2014'}</p>
              <p className="mt-2 text-xs text-text-muted">Due within 60 days</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
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
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-text-muted">Avg. adjustment</p>
                <span className="material-symbols-outlined rounded-lg bg-violet-500/15 p-1.5 text-violet-600 text-[22px]">percent</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">{avgAdj}%</p>
              <p className="mt-2 text-xs text-text-muted">Blended TUFE / UFE (TCMB)</p>
            </div>
          </div>

          {urgentExpirations.length > 0 && (
            <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined rounded-lg bg-amber-500/20 p-2 text-amber-600 text-[22px]">priority_high</span>
                  <div>
                    <h3 className="text-sm font-bold">Priority renewals</h3>
                    <p className="mt-1 text-sm text-text-muted">Closest deadlines are ready for review.</p>
                  </div>
                </div>
                <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3 lg:max-w-3xl">
                  {urgentExpirations.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(`/renewal-review/${item.id}`)}
                      className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-surface px-3 py-2 text-left transition-colors hover:border-amber-500/50"
                    >
                      <span className="min-w-0 truncate text-sm font-semibold">{item.company_name}</span>
                      <span className="shrink-0 text-xs font-bold text-amber-600">{item.days_until}d</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Contract expiry calendar (next 120 days) */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            <div ref={calendarBoxRef}>
              <ContractExpiryCalendar
                events={stats?.expiring_calendar || []}
                selectedDay={calendarDay}
                onDaySelect={setCalendarDay}
              />
            </div>
            <div
              className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6"
              style={
                isLg && calendarBoxHeight
                  ? { height: `${calendarBoxHeight}px` }
                  : undefined
              }
            >
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
              <ul
                className="rg-scroll min-h-0 flex-1 space-y-2 overflow-y-scroll pr-1"
                style={{ scrollbarGutter: 'stable' }}
              >
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
              <section className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6 lg:col-span-2">
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

              <section className="rounded-xl border border-primary/25 bg-primary-soft p-4 shadow-sm sm:p-6">
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
            <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
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
                      const newPrice = calcNewPrice(amount, rule, tufe, ufe, row.max_increase_limit)
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
            <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
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
