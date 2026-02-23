const clients = [
  ['AC', 'Acme Corp', 'John Doe', 'john@acme.com', '$120,000', 'High (85)', 'Active'],
  ['GI', 'Globex Inc', 'Jane Smith', 'jane@globex.com', '$85,000', 'Low (12)', 'Renewing'],
  ['SC', 'Soylent Corp', 'Bob Johnson', 'bob@soylent.com', '$250,000', 'Medium (45)', 'Active'],
  ['IN', 'Initech', 'Peter Gibbons', 'peter@initech.com', '$45,000', 'Low (5)', 'Paused'],
  ['UC', 'Umbrella Corp', 'Albert Wesker', 'a.wesker@umbrella.com', '$500,000', 'High (92)', 'Critical'],
]

export default function ClientManagementPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-background-light text-text-primary">
      <header className="flex shrink-0 items-center justify-between border-b border-border-light bg-surface-light px-8 py-5">
        <div>
          <h2 className="text-2xl font-bold">Client Management</h2>
          <p className="mt-1 text-sm text-text-secondary">Manage profiles, risk assessments, and contract renewals.</p>
        </div>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark">New Client</button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mb-6 flex gap-4">
            <input
              className="w-full max-w-md rounded-lg border border-border-light bg-surface-light px-4 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Search clients by name, ID, or risk score..."
              type="text"
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-border-light bg-surface-light shadow-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border-light bg-background-light text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  <th className="px-6 py-4">Company Name</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Contract Value</th>
                  <th className="px-6 py-4">Risk Score</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {clients.map((client) => (
                  <tr className="transition-colors hover:bg-background-light" key={client[1]}>
                    <td className="px-6 py-4 font-medium">{client[1]}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-col">
                        <span>{client[2]}</span>
                        <span className="text-xs text-text-secondary">{client[3]}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{client[4]}</td>
                    <td className="px-6 py-4 text-sm">{client[5]}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        client[6] === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                        client[6] === 'Renewing' ? 'bg-amber-100 text-amber-700' :
                        client[6] === 'Critical' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {client[6]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button className="text-primary hover:text-primary-dark">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="z-10 flex h-full w-[420px] shrink-0 flex-col overflow-hidden border-l border-border-light bg-surface-light shadow-lg">
          <div className="border-b border-border-light px-6 py-5">
            <h3 className="text-lg font-bold">Edit Client Profile</h3>
            <p className="mt-1 text-xs text-text-secondary">ID: #C-2024-001</p>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">Company Details</h4>
              <input className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" defaultValue="Acme Corp" />
            </div>
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">Analysis & Configuration</h4>
              <div className="rounded-lg border border-border-light bg-background-light p-4 text-sm">
                <span className="font-medium">Risk Score:</span> 85/100 <span className="text-red-600">(High)</span>
              </div>
            </div>
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">Contract Documents</h4>
              <button className="w-full rounded-xl border-2 border-dashed border-border-light p-8 text-center text-sm text-text-secondary transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary">
                <span className="material-symbols-outlined mb-2 text-2xl">upload_file</span>
                <p>Click to upload or drag and drop</p>
              </button>
            </div>
          </div>
          <div className="flex gap-3 border-t border-border-light bg-background-light p-6">
            <button className="flex-1 rounded-lg border border-border-light bg-surface-light px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-border-light">Cancel</button>
            <button className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">Save Changes</button>
          </div>
        </aside>
      </div>
    </div>
  )
}
