const rows = [
  {
    initials: 'AT',
    name: 'Acme Tech Solutions',
    exp: 'Exp: Oct 24, 2023',
    type: 'Software License',
    current: '$12,000',
    next: '$16,500',
    adj: '+37.5%',
  },
  {
    initials: 'GL',
    name: 'Global Logistics Inc',
    exp: 'Exp: Oct 28, 2023',
    type: 'Service Retainer',
    current: '$8,500',
    next: '$12,100',
    adj: '+42.3%',
  },
  {
    initials: 'NS',
    name: 'Nexus Systems',
    exp: 'Exp: Nov 02, 2023',
    type: 'Infrastructure',
    current: '$45,000',
    next: '$58,250',
    adj: '+29.4%',
  },
]

export default function MainDashboardPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-background-light text-text-primary">
      <header className="flex shrink-0 items-center justify-between border-b border-border-light bg-surface-light px-8 py-5">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Overview</h2>
          <p className="mt-1 text-sm text-text-secondary">Manage renewals and monitor inflation metrics.</p>
        </div>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark">New Contract</button>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="space-y-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-border-light bg-surface-light p-6 shadow-sm">
                <p className="text-sm font-medium text-text-secondary">Expiring in 30 Days</p>
                <p className="mt-1 text-3xl font-bold">12</p>
                <p className="mt-2 text-xs text-text-secondary">4 contracts need urgent review</p>
              </div>
              <div className="rounded-xl border border-border-light bg-surface-light p-6 shadow-sm">
                <p className="text-sm font-medium text-text-secondary">Pending Approvals</p>
                <p className="mt-1 text-3xl font-bold">5</p>
                <p className="mt-2 text-xs text-text-secondary">Awaiting executive sign-off</p>
              </div>
              <div className="rounded-xl border border-border-light bg-surface-light p-6 shadow-sm">
                <p className="text-sm font-medium text-text-secondary">Avg Inflation Adjustment</p>
                <p className="mt-1 text-3xl font-bold">42.5%</p>
                <p className="mt-2 text-xs text-text-secondary">Based on CPI/PPI blended rates</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <section className="rounded-xl border border-border-light bg-surface-light p-6 shadow-sm lg:col-span-2">
                <h3 className="text-lg font-bold">Inflation Trends & Exchange Rates</h3>
                <p className="text-sm text-text-secondary">CPI vs PPI vs USD/TRY (Last 6 Months)</p>
                <div className="relative mt-4 h-64">
                  <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 800 300">
                    <line x1="0" y1="250" x2="800" y2="250" stroke="#e2e8f0" strokeWidth="1" />
                    <path d="M0,220 C100,210 200,180 300,160 S500,140 600,110 S700,90 800,80" fill="none" stroke="#3b82f6" strokeWidth="3" />
                    <path d="M0,230 C120,200 240,190 350,150 S550,100 650,80 S750,60 800,50" fill="none" stroke="#10b981" strokeWidth="3" />
                    <path d="M0,240 C80,235 160,230 240,220 S400,210 560,190 S720,180 800,175" fill="none" stroke="#94a3b8" strokeDasharray="5,5" strokeWidth="3" />
                  </svg>
                </div>
              </section>

              <section className="rounded-xl border border-primary/20 bg-primary/5 p-6">
                <h3 className="text-lg font-bold text-primary">Market Alerts</h3>
                <div className="mt-4 space-y-3">
                  <div className="rounded-lg border border-border-light bg-surface-light p-4 shadow-sm">
                    <p className="text-sm font-semibold">CPI Spiked +4.2%</p>
                    <p className="mt-1 text-xs text-text-secondary">Inflation data released today exceeds quarterly projections.</p>
                  </div>
                  <div className="rounded-lg border border-border-light bg-surface-light p-4 shadow-sm">
                    <p className="text-sm font-semibold">New Regulatory Cap</p>
                    <p className="mt-1 text-xs text-text-secondary">Rent increase caps adjusted to 25% for residential contracts.</p>
                  </div>
                </div>
              </section>
            </div>

            <section className="overflow-hidden rounded-xl border border-border-light bg-surface-light shadow-sm">
              <div className="border-b border-border-light p-6">
                <h3 className="text-lg font-bold">Pending Renewals</h3>
                <p className="mt-1 text-sm text-text-secondary">Contracts requiring attention based on new EVDS API data.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-background-light">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Client Name</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Contract Type</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Current Price</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Calc. New Price</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Adjustment</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {rows.map((row) => (
                      <tr className="transition-colors hover:bg-background-light" key={row.name}>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {row.initials}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{row.name}</p>
                              <p className="text-xs text-text-secondary">{row.exp}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">{row.type}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">{row.current}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-bold">{row.next}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-amber-600">{row.adj}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <button className="rounded border border-primary/30 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5">Review</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
  )
}
