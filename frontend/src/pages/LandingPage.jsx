import { Link } from 'react-router-dom'
import MarketingLayout from '../components/MarketingLayout'

const metrics = [
  ['30/15/7', 'day renewal alerts'],
  ['TCMB', 'market data source'],
  ['RBAC', 'role-based controls'],
]

const features = [
  ['event_upcoming', 'Never miss renewals', 'Calendar views, alerts, and priority queues keep expiring contracts visible before revenue leaks begin.'],
  ['calculate', 'Apply market logic', 'TUFE, UFE, blended rules, caps, and custom increases are calculated consistently for each contract.'],
  ['approval_delegation', 'Control approvals', 'Finance, sales, company admin, client, and HR workflows stay separated with clear ownership.'],
]

export default function LandingPage() {
  return (
    <MarketingLayout>
      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
        <img
          alt="Modern finance operations workspace"
          className="absolute inset-0 h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1800&q=80"
        />
        <div className="absolute inset-0 bg-slate-950/70" />
        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col justify-center px-6 py-20 md:px-10">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
              Contract revenue protection
            </span>
            <h1 className="headline-font mt-5 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-6xl">
              RateGuard
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200 md:text-xl">
              A focused platform for inflation-indexed contract renewals, approval workflows, market-data calculations, and company team applications.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-colors hover:bg-primary-dark">
                Start managing renewals
              </Link>
              <Link to="/solutions" className="rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/20">
                Explore solutions
              </Link>
            </div>
          </div>
          <div className="mt-14 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3">
            {metrics.map(([value, label]) => (
              <div key={label} className="border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-2xl font-extrabold text-white">{value}</p>
                <p className="mt-1 text-sm text-slate-300">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-bg px-6 py-20 md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h2 className="headline-font text-3xl font-extrabold tracking-tight md:text-4xl">Built for repeated contract work</h2>
            <p className="mt-4 text-base leading-7 text-text-muted">
              RateGuard is not a marketing dashboard. It is a daily operating surface for teams that need to calculate, approve, notify, and document renewals without losing context.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {features.map(([icon, title, text]) => (
              <article key={title} className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                <span className="material-symbols-outlined rounded-lg bg-primary-soft p-2 text-primary text-[26px]">{icon}</span>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-text-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface px-6 py-20 md:px-10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="headline-font text-3xl font-extrabold tracking-tight">One workspace for finance, sales, admin, client, and HR roles</h2>
            <p className="mt-4 text-base leading-7 text-text-muted">
              Each role sees the right operational surface: renewals for contract teams, application management for HR, and simplified contract review for clients.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {['Contract expiry calendar', 'Pending approval queue', 'AI email drafts', 'Company-scoped applications'].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-lg border border-border bg-surface-alt px-4 py-3">
                  <span className="material-symbols-outlined text-emerald-500 text-[20px]">check_circle</span>
                  <span className="text-sm font-semibold">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-surface-alt shadow-xl">
            <img
              alt="Contract analytics on laptop"
              className="h-[420px] w-full object-cover"
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=80"
            />
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
