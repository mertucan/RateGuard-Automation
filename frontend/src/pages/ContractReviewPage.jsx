import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getContracts,
  getContract,
  getMarketData,
  createContract,
  deleteContract,
  getCompanies,
} from '../api'

function ContractList() {
  const navigate = useNavigate()
  const [contracts, setContracts] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    company_id: '',
    previous_amount: '',
    end_date: '',
    inflation_base_rule: 'TUFE',
    max_increase_limit: '',
  })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const [c, co] = await Promise.all([getContracts(), getCompanies()])
      setContracts(c)
      setCompanies(co)
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    setSaving(true)
    try {
      await createContract({
        ...form,
        previous_amount: Number(form.previous_amount),
        max_increase_limit: form.max_increase_limit ? Number(form.max_increase_limit) : null,
      })
      setShowForm(false)
      setForm({ company_id: '', previous_amount: '', end_date: '', inflation_base_rule: 'TUFE', max_increase_limit: '' })
      await load()
    } catch (err) {
      alert('Create failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this contract?')) return
    try {
      await deleteContract(id)
      await load()
    } catch (err) {
      alert('Delete failed: ' + err.message)
    }
  }

  const formatCurrency = (n) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n || 0)

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background-light">
        <p className="text-text-secondary">Loading contracts...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background-light text-text-primary">
      <header className="flex shrink-0 items-center justify-between border-b border-border-light bg-surface-light px-8 py-5">
        <div>
          <h2 className="text-2xl font-bold">Renewal Review</h2>
          <p className="mt-1 text-sm text-text-secondary">Review and approve contract renewals.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          {showForm ? 'Cancel' : 'New Contract'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* New Contract Form */}
          {showForm && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
              <h3 className="mb-4 text-lg font-bold">Create New Contract</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-text-secondary">Company</label>
                  <select
                    className="w-full rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm outline-none focus:border-primary"
                    value={form.company_id}
                    onChange={(e) => setForm({ ...form, company_id: e.target.value })}
                  >
                    <option value="">Select company...</option>
                    {companies.map((co) => (
                      <option key={co.id} value={co.id}>{co.company_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-text-secondary">Amount (TRY)</label>
                  <input
                    className="w-full rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm outline-none focus:border-primary"
                    type="number"
                    value={form.previous_amount}
                    onChange={(e) => setForm({ ...form, previous_amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-text-secondary">End Date</label>
                  <input
                    className="w-full rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm outline-none focus:border-primary"
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-text-secondary">Inflation Base Rule</label>
                  <select
                    className="w-full rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm outline-none focus:border-primary"
                    value={form.inflation_base_rule}
                    onChange={(e) => setForm({ ...form, inflation_base_rule: e.target.value })}
                  >
                    <option value="TUFE">TUFE</option>
                    <option value="UFE">UFE</option>
                    <option value="TUFE+UFE">TUFE + UFE (Average)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-text-secondary">Max Increase Limit (%)</label>
                  <input
                    className="w-full rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm outline-none focus:border-primary"
                    type="number"
                    value={form.max_increase_limit}
                    onChange={(e) => setForm({ ...form, max_increase_limit: e.target.value })}
                  />
                </div>
              </div>
              <button
                onClick={handleCreate}
                disabled={saving || !form.company_id || !form.previous_amount}
                className="mt-4 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Contract'}
              </button>
            </div>
          )}

          {/* Contract Table */}
          <div className="overflow-hidden rounded-xl border border-border-light bg-surface-light shadow-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border-light bg-background-light text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">End Date</th>
                  <th className="px-6 py-4">Inflation Rule</th>
                  <th className="px-6 py-4">Max Limit</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {contracts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-text-secondary">
                      No contracts found. Create one to get started.
                    </td>
                  </tr>
                )}
                {contracts.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-background-light">
                    <td className="px-6 py-4 font-medium">{c.companies?.company_name || '—'}</td>
                    <td className="px-6 py-4 text-sm">{formatCurrency(c.previous_amount)}</td>
                    <td className="px-6 py-4 text-sm">{c.end_date || '—'}</td>
                    <td className="px-6 py-4 text-sm">{c.inflation_base_rule || '—'}</td>
                    <td className="px-6 py-4 text-sm">{c.max_increase_limit ? `${c.max_increase_limit}%` : '—'}</td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button
                        onClick={() => navigate(`/renewal-review/${c.id}`)}
                        className="rounded border border-primary/30 px-3 py-1.5 font-medium text-primary transition-colors hover:bg-primary/5"
                      >
                        Review
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="ml-2 rounded border border-red-300 px-3 py-1.5 font-medium text-red-500 transition-colors hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function ContractDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contract, setContract] = useState(null)
  const [market, setMarket] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [c, m] = await Promise.all([getContract(id), getMarketData()])
        setContract(c)
        setMarket(m)
      } catch (err) {
        console.error('Contract detail error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background-light">
        <p className="text-text-secondary">Loading contract...</p>
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="flex h-full items-center justify-center bg-background-light">
        <p className="text-text-secondary">Contract not found.</p>
      </div>
    )
  }

  const amount = contract.previous_amount || 0
  const tufe = market?.tufe || 0
  const ufe = market?.ufe || 0
  const rule = contract.inflation_base_rule || 'TUFE'

  let adjustment = 0
  if (rule === 'TUFE') adjustment = tufe
  else if (rule === 'UFE') adjustment = ufe
  else adjustment = (tufe + ufe) / 2

  if (contract.max_increase_limit && adjustment > contract.max_increase_limit) {
    adjustment = contract.max_increase_limit
  }

  const newPrice = amount * (1 + adjustment / 100)
  const companyName = contract.companies?.company_name || '—'
  const companyEmail = contract.companies?.authorized_email || '—'

  const formatCurrency = (n) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background-light text-text-primary">
      <header className="flex shrink-0 items-center justify-between border-b border-border-light bg-surface-light px-8 py-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/renewal-review')}
            className="rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm font-semibold transition-colors hover:bg-slate-50"
          >
            <span className="material-symbols-outlined text-base align-middle">arrow_back</span>
          </button>
          <div>
            <h2 className="text-2xl font-bold">Renewal Review</h2>
            <p className="mt-1 text-sm text-text-secondary">Review and approve contract renewals.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="rounded-lg border border-border-light bg-surface-light px-4 py-2 text-sm font-semibold transition-colors hover:bg-slate-50">
            Reject
          </button>
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
            Save Draft
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight">{companyName} Service Agreement</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
              <span className="material-symbols-outlined text-base">timer</span>
              End date: {contract.end_date || '—'} &bull; ID: {contract.id.slice(0, 8)}
            </p>
          </div>

          {/* KPI Cards */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-border-light bg-surface-light p-6 shadow-sm">
              <p className="text-sm font-medium text-text-secondary">Current Contract Value</p>
              <p className="mt-2 text-3xl font-bold">{formatCurrency(amount)}</p>
            </div>
            <div className="rounded-xl border border-border-light bg-surface-light p-6 shadow-sm">
              <p className="text-sm font-medium text-text-secondary">Inflation Adjustment ({rule})</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">+{adjustment.toFixed(1)}%</p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
              <p className="text-sm font-bold text-primary">Calculated New Price</p>
              <p className="mt-2 text-4xl font-black text-primary-dark">{formatCurrency(newPrice)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
            <div className="space-y-8 xl:col-span-7">
              {/* Calculation Logic */}
              <section className="overflow-hidden rounded-xl border border-border-light bg-surface-light shadow-sm">
                <div className="flex items-center justify-between border-b border-border-light bg-background-light px-6 py-4">
                  <h3 className="text-lg font-bold">Calculation Logic</h3>
                </div>
                <div className="space-y-4 p-6 text-sm">
                  <div className="flex justify-between border-b border-dashed border-border-light py-2">
                    <span className="text-text-secondary">Base Rate</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-border-light py-2">
                    <span className="text-text-secondary">TUFE (CPI) Factor</span>
                    <span className="font-medium">+{tufe.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-border-light py-2">
                    <span className="text-text-secondary">UFE (PPI) Factor</span>
                    <span className="font-medium">+{ufe.toFixed(2)}%</span>
                  </div>
                  {contract.max_increase_limit && (
                    <div className="flex justify-between border-b border-dashed border-border-light py-2">
                      <span className="text-text-secondary">Max Increase Limit</span>
                      <span className="font-medium text-red-600">{contract.max_increase_limit}%</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-dashed border-border-light py-2">
                    <span className="text-text-secondary">Applied Rule</span>
                    <span className="font-medium">{rule}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="font-bold">Total Adjustment</span>
                    <span className="font-bold text-primary">{adjustment.toFixed(1)}%</span>
                  </div>
                </div>
              </section>

              {/* Generated Addendum */}
              <section className="min-h-[500px] rounded-xl border border-border-light bg-surface-light shadow-sm">
                <div className="border-b border-border-light bg-background-light px-6 py-4">
                  <h3 className="text-lg font-bold">Generated Addendum</h3>
                  <p className="text-xs text-text-secondary">Auto-generated draft</p>
                </div>
                <div className="max-h-[600px] overflow-y-auto bg-slate-100 p-8">
                  <div className="mx-auto min-h-[842px] w-full max-w-[595px] bg-white p-12 font-serif text-[10px] text-gray-800 shadow-lg">
                    <h1 className="mb-4 text-lg font-bold">CONTRACT ADDENDUM</h1>
                    <p className="mb-2">Ref: Service Agreement #{contract.id.slice(0, 8)}-Renewal</p>
                    <p className="mb-4">
                      THIS ADDENDUM is made by and between RateGuard Systems Inc. and {companyName}.
                    </p>
                    <p className="mb-4">
                      The Annual Service Fee shall be adjusted to reflect a {adjustment.toFixed(1)}% increase,
                      calculated using the {rule} index.
                    </p>
                    <table className="mt-2 w-full text-left">
                      <tbody>
                        <tr className="border-b border-gray-300">
                          <th className="py-1">Description</th>
                          <th className="py-1 text-right">Amount</th>
                        </tr>
                        <tr>
                          <td className="py-1">Previous Annual Base Rate</td>
                          <td className="py-1 text-right">{formatCurrency(amount)}</td>
                        </tr>
                        <tr className="border-t border-gray-200">
                          <td className="py-1 font-bold">New Annual Base Rate</td>
                          <td className="py-1 text-right font-bold">{formatCurrency(newPrice)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>

            {/* AI Email Composer */}
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
                    defaultValue={`Action Required: Service Agreement Renewal - ${companyName}`}
                    type="text"
                  />
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Message Body:</label>
                  <textarea
                    className="h-64 resize-none rounded-lg border border-border-light bg-surface-light p-4 text-sm leading-relaxed outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    defaultValue={`Dear ${companyName},\n\nAttached is the formal addendum outlining the new annual rate of ${formatCurrency(newPrice)}, reflecting a ${adjustment.toFixed(1)}% adjustment based on the ${rule} index.\n\nPrevious rate: ${formatCurrency(amount)}\nNew rate: ${formatCurrency(newPrice)}\n\nBest regards,\nRateGuard Team`}
                  />
                </div>
                <div className="border-t border-border-light bg-background-light p-6">
                  <button className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark">
                    Approve & Send Renewal
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ContractReviewPage() {
  const { id } = useParams()
  return id ? <ContractDetail /> : <ContractList />
}
