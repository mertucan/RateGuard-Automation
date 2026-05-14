import { Link } from 'react-router-dom'
import MarketingLayout from '../components/MarketingLayout'

const benefits = [
  ['payments', 'Protect margin', 'Apply approved inflation rules before underpriced renewals silently erode revenue.'],
  ['schedule', 'Reduce manual follow-up', 'Upcoming deadlines, pending approvals, and client decisions are visible in one queue.'],
  ['fact_check', 'Improve governance', 'Role-based access, status history, approval logs, and PDF outputs support internal control.'],
  ['mail', 'Move faster with AI drafts', 'Generate client-ready renewal emails from contract and market context, then edit before sending.'],
  ['business', 'Keep company scope clean', 'Admins and HR users see only the companies and applications they are assigned to manage.'],
  ['insights', 'See renewal impact', 'Analytics and portfolio views help teams understand value, activity, and contract exposure.'],
]

export default function KeyBenefitsPage() {
  return (
    <MarketingLayout>
      <section className="relative overflow-hidden border-b border-border">
        <img
          alt="Analytics dashboard with financial charts"
          className="absolute inset-0 h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1800&q=80"
        />
        <div className="absolute inset-0 bg-slate-950/70" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:px-10">
          <div className="max-w-3xl">
            <span className="text-sm font-bold uppercase tracking-wider text-primary">Key Benefits</span>
            <h1 className="headline-font mt-3 text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              Less contract drift, more renewal control
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-200">
              RateGuard helps teams protect revenue while keeping every approval, calculation, and application traceable.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map(([icon, title, text]) => (
            <article key={title} className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <span className="material-symbols-outlined rounded-lg bg-primary-soft p-2 text-primary text-[26px]">{icon}</span>
              <h2 className="mt-5 text-lg font-bold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-text-muted">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface px-6 py-16 md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="headline-font text-2xl font-extrabold tracking-tight">Ready to make renewals visible?</h2>
            <p className="mt-2 text-sm text-text-muted">Start with your contract deadlines, market rules, and approval roles.</p>
          </div>
          <Link to="/contact" className="inline-flex w-fit rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark">
            Contact us
          </Link>
        </div>
      </section>
    </MarketingLayout>
  )
}
