import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardStats, getContracts } from '../api'

export default function MainDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [s, c] = await Promise.all([
          getDashboardStats(),
          getContracts({ pending: 'true' }),
        ])
        setStats(s)
        setRows(c)
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const initials = (name) =>
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  const formatCurrency = (n) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

  const calcNewPrice = (amount, tufe, ufe) => {
    const adj = ((tufe || 0) + (ufe || 0)) / 2 / 100
    return amount * (1 + adj)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background-light">
        <p className="text-text-secondary">Loading dashboard...</p>
      </div>
    )
  }

  const tufe = stats?.tufe || 0
  const ufe = stats?.ufe || 0
  const avgAdj = stats?.avg_adjustment || 0

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background-light text-text-primary">
      <header className="flex shrink-0 items-center justify-between border-b border-border-light bg-surface-light px-8 py-5">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Overview</h2>
          <p className="mt-1 text-sm text-text-secondary">Manage renewals and monitor inflation metrics.</p>
        </div>
        <button
          onClick={() => navigate('/renewal-review')}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          New Contract
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-border-light bg-surface-light p-6 shadow-sm">
              <p className="text-sm font-medium text-text-secondary">Expiring in 30 Days</p>
              <p className="mt-1 text-3xl font-bold">{stats?.expiring_30 ?? '—'}</p>
              <p className="mt-2 text-xs text-text-secondary">Contracts need urgent review</p>
            </div>
            <div className="rounded-xl border border-border-light bg-surface-light p-6 shadow-sm">
              <p className="text-sm font-medium text-text-secondary">Pending Approvals</p>
              <p className="mt-1 text-3xl font-bold">{stats?.pending_approvals ?? '—'}</p>
              <p className="mt-2 text-xs text-text-secondary">Expiring within 60 days</p>
            </div>
            <div className="rounded-xl border border-border-light bg-surface-light p-6 shadow-sm">
              <p className="text-sm font-medium text-text-secondary">Avg Inflation Adjustment</p>
              <p className="mt-1 text-3xl font-bold">{avgAdj}%</p>
              <p className="mt-2 text-xs text-text-secondary">Based on TUFE/UFE blended rates</p>
            </div>
          </div>

          {/* Market Data + Alerts */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <section className="rounded-xl border border-border-light bg-surface-light p-6 shadow-sm lg:col-span-2">
              <h3 className="text-lg font-bold">Market Snapshot</h3>
              <p className="text-sm text-text-secondary">Live data from TCMB EVDS</p>
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-border-light p-4 text-center">
                  <p className="text-xs font-medium text-text-secondary">USD/TRY</p>
                  <p className="mt-1 text-2xl font-bold">{stats?.usd ? stats.usd.toFixed(2) : '—'}</p>
                </div>
                <div className="rounded-lg border border-border-light p-4 text-center">
                  <p className="text-xs font-medium text-text-secondary">EUR/TRY</p>
                  <p className="mt-1 text-2xl font-bold">{stats?.eur ? stats.eur.toFixed(2) : '—'}</p>
                </div>
                <div className="rounded-lg border border-border-light p-4 text-center">
                  <p className="text-xs font-medium text-text-secondary">TUFE (YoY)</p>
                  <p className="mt-1 text-2xl font-bold text-amber-600">%{tufe.toFixed(1)}</p>
                </div>
                <div className="rounded-lg border border-border-light p-4 text-center">
                  <p className="text-xs font-medium text-text-secondary">UFE (YoY)</p>
                  <p className="mt-1 text-2xl font-bold text-amber-600">%{ufe.toFixed(1)}</p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-primary/20 bg-primary/5 p-6">
              <h3 className="text-lg font-bold text-primary">Market Alerts</h3>
              <div className="mt-4 space-y-3">
                {tufe > 40 && (
                  <div className="rounded-lg border border-border-light bg-surface-light p-4 shadow-sm">
                    <p className="text-sm font-semibold">High CPI Alert</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      TUFE is at %{tufe.toFixed(1)} – contract adjustments may be significant.
                    </p>
                  </div>
                )}
                {stats?.usd > 35 && (
                  <div className="rounded-lg border border-border-light bg-surface-light p-4 shadow-sm">
                    <p className="text-sm font-semibold">Exchange Rate Warning</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      USD/TRY is at {stats.usd.toFixed(2)} – review FX-linked contracts.
                    </p>
                  </div>
                )}
                {tufe <= 40 && (!stats?.usd || stats.usd <= 35) && (
                  <div className="rounded-lg border border-border-light bg-surface-light p-4 shadow-sm">
                    <p className="text-sm font-semibold">All Clear</p>
                    <p className="mt-1 text-xs text-text-secondary">No critical market alerts at this time.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Pending Renewals Table */}
          <section className="overflow-hidden rounded-xl border border-border-light bg-surface-light shadow-sm">
            <div className="border-b border-border-light p-6">
              <h3 className="text-lg font-bold">Pending Renewals</h3>
              <p className="mt-1 text-sm text-text-secondary">
                Contracts requiring attention based on EVDS data.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-background-light">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Client Name</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">End Date</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Current Price</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Calc. New Price</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Adjustment</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-text-secondary">
                        No pending renewals found.
                      </td>
                    </tr>
                  )}
                  {rows.map((row) => {
                    const companyName = row.companies?.company_name || '—'
                    const amount = row.previous_amount || 0
                    const newPrice = calcNewPrice(amount, tufe, ufe)
                    const adjPct = amount > 0 ? (((newPrice - amount) / amount) * 100).toFixed(1) : '0'

                    return (
                      <tr className="transition-colors hover:bg-background-light" key={row.id}>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {initials(companyName)}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{companyName}</p>
                              <p className="text-xs text-text-secondary">
                                {row.inflation_base_rule || 'TUFE'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">{row.end_date || '—'}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">{formatCurrency(amount)}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-bold">{formatCurrency(newPrice)}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-amber-600">+{adjPct}%</td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <button
                            onClick={() => navigate(`/renewal-review/${row.id}`)}
                            className="rounded border border-primary/30 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
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
        </div>
      </div>
    </div>
  )
}
