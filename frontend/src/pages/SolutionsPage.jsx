import { Link } from 'react-router-dom'
import MarketingLayout from '../components/MarketingLayout'

const solutionBlocks = [
  ['contract_edit', 'Renewal operations', 'Track end dates, calculate new prices, prepare drafts, and move contracts through approval without spreadsheet drift.'],
  ['monitoring', 'Market data intelligence', 'Use official inflation and exchange-rate inputs to keep every renewal calculation explainable and repeatable.'],
  ['groups', 'Role-based collaboration', 'Separate finance, sales, company admin, client, and HR responsibilities so each team sees only what it should act on.'],
  ['assignment_ind', 'Application management', 'Let users apply to company departments and allow HR or admins to approve them within company scope.'],
]

export default function SolutionsPage() {
  return (
    <MarketingLayout>
      <section className="relative overflow-hidden border-b border-border">
        <img
          alt="Team reviewing financial operations"
          className="absolute inset-0 h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1800&q=80"
        />
        <div className="absolute inset-0 bg-slate-950/70" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:px-10">
          <div className="max-w-3xl">
            <span className="text-sm font-bold uppercase tracking-wider text-primary">Solutions</span>
            <h1 className="headline-font mt-3 text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              Operational tools for every renewal decision
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-200">
              RateGuard connects contract dates, market rates, approval ownership, and team applications into one governed workflow.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-2">
          {solutionBlocks.map(([icon, title, text]) => (
            <article key={title} className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined rounded-lg bg-primary-soft p-2 text-primary text-[26px]">{icon}</span>
                <div>
                  <h2 className="text-xl font-bold">{title}</h2>
                  <p className="mt-3 text-sm leading-6 text-text-muted">{text}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface px-6 py-20 md:px-10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <h2 className="headline-font text-3xl font-extrabold tracking-tight">From intake to signed renewal</h2>
            <p className="mt-4 text-base leading-7 text-text-muted">
              Your team can create contracts, calculate inflation-based increases, generate client communication, send approvals, and keep audit trails from the same system.
            </p>
            <Link to="/contact" className="mt-7 inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark">
              Talk to us
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {['Create or import contract', 'Calculate new amount', 'Finance and admin review', 'Client approval and PDF archive'].map((step, idx) => (
              <div key={step} className="rounded-xl border border-border bg-surface-alt p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Step {idx + 1}</p>
                <p className="mt-3 text-lg font-bold">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
