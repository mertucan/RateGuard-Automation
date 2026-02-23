export default function ContractReviewPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-background-light text-text-primary">
      <header className="flex shrink-0 items-center justify-between border-b border-border-light bg-surface-light px-8 py-5">
        <div>
          <h2 className="text-2xl font-bold">Renewal Review</h2>
          <p className="mt-1 text-sm text-text-secondary">Review and approve contract renewals.</p>
        </div>
        <div className="flex gap-3">
          <button className="rounded-lg border border-border-light bg-surface-light px-4 py-2 text-sm font-semibold transition-colors hover:bg-slate-50">Reject</button>
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">Save Draft</button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight">Acme Corp Service Agreement</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
              <span className="material-symbols-outlined text-base">timer</span>
              Expires in 14 days • ID: #CTR-2023-892
            </p>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-border-light bg-surface-light p-6 shadow-sm">
              <p className="text-sm font-medium text-text-secondary">Current Contract Value</p>
              <p className="mt-2 text-3xl font-bold">$12,000.00</p>
            </div>
            <div className="rounded-xl border border-border-light bg-surface-light p-6 shadow-sm">
              <p className="text-sm font-medium text-text-secondary">Inflation Adjustment (CPI+PPI)</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">+8.5%</p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
              <p className="text-sm font-bold text-primary">Calculated New Price</p>
              <p className="mt-2 text-4xl font-black text-primary-dark">$13,020.00</p>
            </div>
          </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
          <div className="space-y-8 xl:col-span-7">
            <section className="overflow-hidden rounded-xl border border-border-light bg-surface-light shadow-sm">
              <div className="flex items-center justify-between border-b border-border-light bg-background-light px-6 py-4">
                <h3 className="text-lg font-bold">Calculation Logic</h3>
                <button className="text-sm font-medium text-primary transition-colors hover:text-primary-dark">View Formula Details</button>
              </div>
              <div className="space-y-4 p-6 text-sm">
                <div className="flex justify-between border-b border-dashed border-border-light py-2">
                  <span className="text-text-secondary">Base Rate (2022-2023)</span>
                  <span className="font-medium">$12,000.00</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-border-light py-2">
                  <span className="text-text-secondary">CPI Factor</span>
                  <span className="font-medium">+ 4.2%</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-border-light py-2">
                  <span className="text-text-secondary">PPI Factor</span>
                  <span className="font-medium">+ 4.3%</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="font-bold">Total Adjustment</span>
                  <span className="font-bold text-primary">8.5%</span>
                </div>
              </div>
            </section>

            <section className="min-h-[500px] rounded-xl border border-border-light bg-surface-light shadow-sm">
              <div className="border-b border-border-light bg-background-light px-6 py-4">
                <h3 className="text-lg font-bold">Generated Addendum</h3>
                <p className="text-xs text-text-secondary">Draft v1.2 • Auto-generated 2 mins ago</p>
              </div>
              <div className="max-h-[600px] overflow-y-auto bg-slate-100 p-8">
                <div className="mx-auto min-h-[842px] w-full max-w-[595px] bg-white p-12 font-serif text-[10px] text-gray-800 shadow-lg">
                  <h1 className="mb-4 text-lg font-bold">CONTRACT ADDENDUM</h1>
                  <p className="mb-2">Ref: Service Agreement #892-Renewal</p>
                  <p className="mb-4">
                    THIS ADDENDUM is made on this 24th day of October, 2023, by and between RateGuard Systems Inc. and Acme Corp.
                  </p>
                  <p className="mb-4">The Annual Service Fee shall be adjusted to reflect an 8.5% increase.</p>
                  <table className="mt-2 w-full text-left">
                    <tbody>
                      <tr className="border-b border-gray-300">
                        <th className="py-1">Description</th>
                        <th className="py-1 text-right">Amount</th>
                      </tr>
                      <tr>
                        <td className="py-1">New Annual Base Rate</td>
                        <td className="py-1 text-right">$13,020.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>

          <div className="xl:col-span-5">
            <section className="sticky top-8 flex h-full flex-col rounded-xl border border-border-light bg-surface-light shadow-sm">
              <div className="flex items-center justify-between border-b border-border-light bg-primary/5 px-6 py-4">
                <h3 className="text-lg font-bold text-primary">AI Email Composer</h3>
                <span className="rounded bg-primary/10 px-2 py-1 text-xs font-bold uppercase tracking-wider text-primary">Draft</span>
              </div>
              <div className="flex flex-1 flex-col gap-4 p-6">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Subject:</label>
                <input
                  className="rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  defaultValue="Action Required: Service Agreement Renewal #892"
                  type="text"
                />
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Message Body:</label>
                <textarea
                  className="h-64 resize-none rounded-lg border border-border-light bg-surface-light p-4 text-sm leading-relaxed outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  defaultValue={`Dear Jane,\n\nAttached is the formal addendum outlining the new annual rate of $13,020.00.\n\nBest regards,\nRateGuard Team`}
                />
              </div>
              <div className="border-t border-border-light bg-background-light p-6">
                <button className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark">Approve & Send Renewal</button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}
