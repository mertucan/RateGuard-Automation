import MarketingLayout from '../components/MarketingLayout'

const values = [
  ['Accuracy first', 'Contract math must be traceable, consistent, and explainable to finance leaders.'],
  ['Workflow clarity', 'Every role should know what it owns, what is waiting, and what changed.'],
  ['Practical automation', 'AI assists teams with drafts and analysis while humans keep decision control.'],
]

export default function AboutUsPage() {
  return (
    <MarketingLayout>
      <section className="relative overflow-hidden border-b border-border">
        <img
          alt="Corporate team planning contract operations"
          className="absolute inset-0 h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1800&q=80"
        />
        <div className="absolute inset-0 bg-slate-950/70" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:px-10">
          <div className="max-w-3xl">
            <span className="text-sm font-bold uppercase tracking-wider text-primary">About RateGuard</span>
            <h1 className="headline-font mt-3 text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              We build guardrails for revenue-critical agreements
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-200">
              RateGuard was created for companies that cannot afford missed renewal dates, inconsistent inflation calculations, or unclear approval ownership.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="headline-font text-3xl font-extrabold tracking-tight">Why we exist</h2>
            <p className="mt-4 text-base leading-7 text-text-muted">
              Inflation-indexed contracts are operationally demanding. Teams must watch dates, source market data, calculate increases, communicate with clients, and prove who approved what. RateGuard turns that work into a structured system.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {values.map(([title, text]) => (
              <article key={title} className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-text-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface px-6 py-20 md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <h2 className="headline-font text-3xl font-extrabold tracking-tight">Designed around real teams</h2>
            <p className="mt-4 text-base leading-7 text-text-muted">
              The product supports finance users checking calculations, sales teams preparing client communication, admins managing client companies, HR teams reviewing department applications, and clients approving final terms.
            </p>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
