import { useEffect, useState, useCallback } from 'react'
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../api'

const emptyForm = {
  company_name: '',
  authorized_email: '',
  risk_score: '',
  communication_language: 'tr',
}

export default function ClientManagementPage() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getCompanies(search)
      setClients(data)
    } catch (err) {
      console.error('Companies load error:', err)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [load])

  const openNew = () => {
    setSelected(null)
    setForm(emptyForm)
    setIsNew(true)
  }

  const openEdit = (client) => {
    setIsNew(false)
    setSelected(client)
    setForm({
      company_name: client.company_name || '',
      authorized_email: client.authorized_email || '',
      risk_score: client.risk_score ?? '',
      communication_language: client.communication_language || 'tr',
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        risk_score: form.risk_score === '' ? null : Number(form.risk_score),
      }
      if (isNew) {
        await createCompany(payload)
      } else {
        await updateCompany(selected.id, payload)
      }
      setIsNew(false)
      setSelected(null)
      setForm(emptyForm)
      await load()
    } catch (err) {
      console.error('Save error:', err)
      alert('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this company?')) return
    try {
      await deleteCompany(id)
      if (selected?.id === id) {
        setSelected(null)
        setForm(emptyForm)
      }
      await load()
    } catch (err) {
      console.error('Delete error:', err)
      alert('Delete failed: ' + err.message)
    }
  }

  const closeSidebar = () => {
    setSelected(null)
    setIsNew(false)
    setForm(emptyForm)
  }

  const riskLabel = (score) => {
    if (score == null) return { text: '—', color: 'text-slate-500' }
    if (score >= 70) return { text: `High (${score})`, color: 'text-red-600' }
    if (score >= 30) return { text: `Medium (${score})`, color: 'text-amber-600' }
    return { text: `Low (${score})`, color: 'text-emerald-600' }
  }

  const statusBadge = (status) => {
    const map = {
      Active: 'bg-emerald-100 text-emerald-700',
      Renewing: 'bg-amber-100 text-amber-700',
      Critical: 'bg-red-100 text-red-700',
      Paused: 'bg-slate-100 text-slate-700',
    }
    return map[status] || 'bg-slate-100 text-slate-700'
  }

  const formatCurrency = (n) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n || 0)

  const sidebarOpen = isNew || selected !== null

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background-light text-text-primary">
      <header className="flex shrink-0 items-center justify-between border-b border-border-light bg-surface-light px-8 py-5">
        <div>
          <h2 className="text-2xl font-bold">Client Management</h2>
          <p className="mt-1 text-sm text-text-secondary">Manage profiles, risk assessments, and contract renewals.</p>
        </div>
        <button onClick={openNew} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark">
          New Client
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mb-6 flex gap-4">
            <input
              className="w-full max-w-md rounded-lg border border-border-light bg-surface-light px-4 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Search clients by name..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <p className="py-12 text-center text-text-secondary">Loading clients...</p>
          ) : (
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
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-text-secondary">
                        No clients found.
                      </td>
                    </tr>
                  )}
                  {clients.map((c) => {
                    const risk = riskLabel(c.risk_score)
                    return (
                      <tr className="transition-colors hover:bg-background-light" key={c.id}>
                        <td className="px-6 py-4 font-medium">{c.company_name}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="text-xs text-text-secondary">{c.authorized_email}</span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">{formatCurrency(c.contract_value)}</td>
                        <td className={`px-6 py-4 text-sm ${risk.color}`}>{risk.text}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadge(c.status)}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <button onClick={() => openEdit(c)} className="text-primary hover:text-primary-dark">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="ml-3 text-red-500 hover:text-red-700">
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="z-10 flex h-full w-[420px] shrink-0 flex-col overflow-hidden border-l border-border-light bg-surface-light shadow-lg">
            <div className="border-b border-border-light px-6 py-5">
              <h3 className="text-lg font-bold">{isNew ? 'New Client' : 'Edit Client Profile'}</h3>
              {selected && <p className="mt-1 text-xs text-text-secondary">ID: {selected.id.slice(0, 8)}</p>}
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">Company Name</h4>
                <input
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                />
              </div>
              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">Authorized Email</h4>
                <input
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={form.authorized_email}
                  onChange={(e) => setForm({ ...form, authorized_email: e.target.value })}
                  type="email"
                />
              </div>
              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">Risk Score (0-100)</h4>
                <input
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={form.risk_score}
                  onChange={(e) => setForm({ ...form, risk_score: e.target.value })}
                  type="number"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">Communication Language</h4>
                <select
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={form.communication_language}
                  onChange={(e) => setForm({ ...form, communication_language: e.target.value })}
                >
                  <option value="tr">Turkish</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 border-t border-border-light bg-background-light p-6">
              <button onClick={closeSidebar} className="flex-1 rounded-lg border border-border-light bg-surface-light px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-border-light">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.company_name || !form.authorized_email}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
              >
                {saving ? 'Saving...' : isNew ? 'Create' : 'Save Changes'}
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
