import MarketingLayout from '../components/MarketingLayout'

const sections = [
  ['Information We Process', 'Account details, company records, contract metadata, application records, renewal calculations, approval decisions, notifications, and user-entered communication content.'],
  ['How We Use Data', 'We use this information to operate dashboards, calculate renewals, manage approvals, process department applications, generate operational drafts, and maintain audit context.'],
  ['Access And Scope', 'Role-based permissions are used throughout the product. Company users, including HR, are scoped to assigned company data where backend controls enforce that boundary.'],
  ['Operational Providers', 'Some features may rely on email delivery, AI assistance, market-data sources, database hosting, and application infrastructure providers.'],
  ['Retention And Requests', 'Organizations should keep their workspace data accurate and request deletion or correction when records are no longer needed for operations.'],
]

export default function PrivacyPolicyPage() {
  return (
    <MarketingLayout>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-16 md:px-10 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div>
            <span className="inline-flex rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              Privacy Policy
            </span>
            <h1 className="headline-font mt-5 text-4xl font-extrabold tracking-tight md:text-5xl">
              Data handling for contract operations
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-text-muted">
              This page explains what RateGuard processes while helping teams manage contracts, renewals, approvals, applications, and related business workflows.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-alt p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Last updated</p>
            <p className="mt-2 text-2xl font-extrabold">May 14, 2026</p>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              Questions about privacy can be sent through the contact page.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-14 md:px-10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit rounded-xl border border-border bg-surface p-5">
            <p className="text-sm font-bold">Policy Summary</p>
            <div className="mt-4 space-y-3 text-sm text-text-muted">
              <p>Built for company-scoped access.</p>
              <p>Used for operational workflows.</p>
              <p>Designed around role-based controls.</p>
            </div>
          </aside>
          <div className="space-y-4">
            {sections.map(([title, text], index) => (
              <article key={title} className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-sm font-extrabold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <h2 className="text-xl font-bold">{title}</h2>
                    <p className="mt-3 text-sm leading-7 text-text-muted">{text}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
