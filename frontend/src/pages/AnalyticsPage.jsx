import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { getMarketHistory, getDashboardStats, getRevenueAnalysis } from '../api'
import Spinner from '../components/Spinner'

const periods = [
  { label: '30 Days', value: 30 },
  { label: '6 Months', value: 180 },
  { label: '1 Year', value: 365 },
]

function formatDate(raw) {
  if (!raw) return ''
  const parts = raw.split('-')
  if (parts.length === 3 && parts[0].length === 2) {
    return `${parts[0]}/${parts[1]}`
  }
  return raw.slice(5)
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <div className="mb-4">
        <h3 className="text-base font-bold">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-text-muted">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
        </p>
      ))}
    </div>
  )
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <span className="material-symbols-outlined mb-3 text-5xl text-text-muted">{icon}</span>
      <p className="text-sm font-semibold text-text">{title}</p>
      <p className="mt-1 max-w-sm text-center text-xs text-text-muted">{subtitle}</p>
    </div>
  )
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState(30)
  const [history, setHistory] = useState(null)
  const [stats, setStats] = useState(null)
  const [revenue, setRevenue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const params = {}
    if (user?.role === 'company_admin' && user?.company_id) {
      params.tenant_company_id = user.company_id
    }

    const canSeeRevenue = ['super_admin', 'company_admin'].includes(user?.role)

    Promise.all([
      getMarketHistory(period),
      getDashboardStats({ ...params, period_days: period }),
      canSeeRevenue
        ? getRevenueAnalysis({ period: 'month', ...params }).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([h, s, r]) => {
        setHistory(h)
        setStats(s)
        setRevenue(r)
      })
      .catch((err) => {
        console.error('Analytics load error:', err)
        setError(err.message || 'Failed to load analytics data')
      })
      .finally(() => setLoading(false))
  }, [period, user])

  const fxData = (history?.fx || []).map((d) => ({
    ...d,
    date: formatDate(d.date),
  }))

  const inflationData = (history?.inflation || []).map((d) => ({
    ...d,
    date: formatDate(d.date),
  }))

  const latestFx = fxData.length > 0 ? fxData[fxData.length - 1] : null
  const latestInf = inflationData.length > 0 ? inflationData[inflationData.length - 1] : null

  const fxChange = fxData.length >= 2
    ? ((fxData[fxData.length - 1].usd - fxData[0].usd) / fxData[0].usd * 100).toFixed(1)
    : null

  const handleExport = () => {
    const headers = ["Date", "USD/TRY", "EUR/TRY", "TUFE (YoY)", "UFE (YoY)"];
    const rows = fxData.map(d => [
      d.date,
      d.usd || "",
      d.eur || "",
      latestInf?.tufe || "",
      latestInf?.ufe || ""
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `market_data_${period}days.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-text">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-4 sm:px-8 sm:py-5">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold sm:text-2xl">Analytics</h2>
          <p className="mt-1 hidden text-sm text-text-muted sm:block">Historical market data and inflation trends.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold transition-colors hover:bg-hover sm:px-4 sm:text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export
          </button>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-alt p-1">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors sm:px-3 ${
                  period === p.value
                    ? 'bg-primary text-white'
                    : 'text-text-muted hover:bg-hover hover:text-text'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <EmptyState
            icon="cloud_off"
            title="Unable to load market data"
            subtitle={`${error}. Please check that the backend is running and the TCMB API key is configured correctly in your .env file.`}
          />
        ) : (
          <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
            {/* Contract KPI Strip */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                <p className="text-xs font-medium text-text-muted">Active contracts</p>
                <p className="mt-1 text-xl font-bold sm:text-2xl">
                  {stats?.active_contracts_count ?? '—'}
                </p>
                <p className="mt-1 text-xs text-text-muted">Open pipeline (non-finalized)</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                <p className="text-xs font-medium text-text-muted">Portfolio value (TRY)</p>
                <p className="mt-1 text-xl font-bold sm:text-2xl">
                  {stats?.total_portfolio_value_try != null
                    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(stats.total_portfolio_value_try)
                    : '—'}
                </p>
                <p className="mt-1 text-xs text-text-muted">Sum of current contract values</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                <p className="text-xs font-medium text-text-muted">Renewed contracts</p>
                <p className="mt-1 text-xl font-bold sm:text-2xl">
                  {stats?.renewed_contracts_in_period_count ?? stats?.renewed_contracts_count ?? revenue?.period_activity?.client_approved ?? '—'}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Last {period} days
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                <p className="text-xs font-medium text-text-muted">Estimated uplift (TRY)</p>
                <p className="mt-1 text-xl font-bold text-amber-500 sm:text-2xl">
                  {stats?.renewed_uplift_in_period_try != null
                    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(stats.renewed_uplift_in_period_try)
                    : revenue?.portfolio?.estimated_renewal_uplift_try != null
                      ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(revenue.portfolio.estimated_renewal_uplift_try)
                      : stats?.renewed_uplift_try != null
                        ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(stats.renewed_uplift_try)
                        : '—'}
                </p>
                <p className="mt-1 text-xs text-text-muted">Rule-based renewal estimate</p>
              </div>
            </div>

            {/* Summary KPI Strip */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                <p className="text-xs font-medium text-text-muted">USD/TRY</p>
                <p className="mt-1 text-xl font-bold sm:text-2xl">{latestFx?.usd?.toFixed(2) ?? '—'}</p>
                {fxChange && (
                  <p className={`mt-1 text-xs font-semibold ${Number(fxChange) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {Number(fxChange) > 0 ? '+' : ''}{fxChange}% period change
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                <p className="text-xs font-medium text-text-muted">EUR/TRY</p>
                <p className="mt-1 text-xl font-bold sm:text-2xl">{latestFx?.eur?.toFixed(2) ?? '—'}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                <p className="text-xs font-medium text-text-muted">TUFE (YoY)</p>
                <p className="mt-1 text-xl font-bold text-amber-500 sm:text-2xl">
                  %{latestInf?.tufe?.toFixed(1) ?? stats?.tufe?.toFixed(1) ?? '—'}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                <p className="text-xs font-medium text-text-muted">UFE (YoY)</p>
                <p className="mt-1 text-xl font-bold text-amber-500 sm:text-2xl">
                  %{latestInf?.ufe?.toFixed(1) ?? stats?.ufe?.toFixed(1) ?? '—'}
                </p>
              </div>
            </div>

            {/* FX Chart */}
            <ChartCard
              title="Exchange Rates"
              subtitle={`USD/TRY & EUR/TRY — Last ${period} days`}
            >
              {fxData.length === 0 ? (
                <EmptyState
                  icon="show_chart"
                  title="No exchange rate data"
                  subtitle="TCMB EVDS did not return FX data for this period. Try a different time range or verify your API key."
                />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={fxData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="usdGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="eurGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                      tickLine={false}
                      axisLine={false}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="usd" name="USD/TRY" stroke="#3b82f6" fill="url(#usdGrad)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="eur" name="EUR/TRY" stroke="#8b5cf6" fill="url(#eurGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* FX Data Table */}
            {fxData.length > 0 && (
              <div className="rounded-xl border border-border bg-surface">
                <div className="border-b border-border p-4 sm:p-6">
                  <h3 className="text-base font-bold">Recent Exchange Rates</h3>
                  <p className="mt-0.5 text-xs text-text-muted">Last 10 data points</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-surface-alt">
                      <tr>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted sm:px-6">Date</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted sm:px-6">USD/TRY</th>
                        <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted sm:table-cell sm:px-6">EUR/TRY</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted sm:px-6">USD Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {fxData.slice(-10).reverse().map((row, i, arr) => {
                        const prev = arr[i + 1]
                        const change = prev?.usd && row.usd ? ((row.usd - prev.usd) / prev.usd * 100).toFixed(2) : null
                        return (
                          <tr key={i} className="transition-colors hover:bg-hover">
                            <td className="px-4 py-3 font-medium sm:px-6">{row.date}</td>
                            <td className="px-4 py-3 sm:px-6">{row.usd?.toFixed(4) ?? '—'}</td>
                            <td className="hidden px-4 py-3 sm:table-cell sm:px-6">{row.eur?.toFixed(4) ?? '—'}</td>
                            <td className="px-4 py-3 sm:px-6">
                              {change !== null ? (
                                <span className={`font-medium ${Number(change) > 0 ? 'text-red-500' : Number(change) < 0 ? 'text-emerald-500' : 'text-text-muted'}`}>
                                  {Number(change) > 0 ? '+' : ''}{change}%
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
