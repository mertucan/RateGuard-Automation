import MarketingLayout from '../components/MarketingLayout'

const terms = [
  ['Platform Use', 'RateGuard helps organizations manage renewal workflows, calculations, approvals, department applications, and operational records. Users are responsible for the accuracy of data they enter.'],
  ['Decision Responsibility', 'The platform supports calculations and drafting workflows, but final legal, financial, and commercial decisions remain with authorized users and their organizations.'],
  ['Account Conduct', 'Users must protect credentials, access only authorized data, and avoid uploading unlawful, misleading, or unauthorized content.'],
  ['Service Dependencies', 'Certain functions may depend on email delivery, market-data sources, AI providers, database hosting, and network availability.'],
  ['Changes And Contact', 'The service may evolve as features are improved. Questions about these terms can be sent through the contact page.'],
]

export default function TermsOfServicePage() {
  return (
    <MarketingLayout>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-16 md:px-10 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div>
            <span className="inline-flex rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              Terms of Service
            </span>
            <h1 className="headline-font mt-5 text-4xl font-extrabold tracking-tight md:text-5xl">
              Rules for using RateGuard responsibly
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-text-muted">
              These terms outline the expected use of RateGuard while teams manage contract renewals, approvals, company records, and application workflows.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-alt p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Last updated</p>
            <p className="mt-2 text-2xl font-extrabold">14.05.2026</p>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              Use RateGuard as an operational assistant, not as a replacement for professional review.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-14 md:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            {terms.map(([title, text], index) => (
              <article key={title} className="grid grid-cols-1 gap-4 border-b border-border p-6 last:border-b-0 md:grid-cols-[140px_1fr]">
                <div>
                  <span className="inline-flex rounded-lg bg-primary-soft px-3 py-2 text-xs font-extrabold text-primary">
                    Clause {index + 1}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">{title}</h2>
                  <p className="mt-3 text-sm leading-7 text-text-muted">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
