import { useEffect, useState, useCallback } from 'react'
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../api'
import Spinner from '../components/Spinner'

const emptyForm = {
  company_name: '',
  authorized_email: '',
  risk_score: '',
  communication_language: 'tr',
}

function DeleteModal({ open, name, onConfirm, onCancel, loading }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
            <span className="material-symbols-outlined text-xl text-red-500">warning</span>
          </div>
          <div>
            <h3 className="text-lg font-bold">Delete Company</h3>
            <p className="text-sm text-text-muted">This action cannot be undone.</p>
          </div>
        </div>
        <p className="mb-4 text-sm text-text">
          Are you sure you want to delete <strong>{name}</strong>? All related contracts will also be affected.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-hover">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50">
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ClientManagementPage() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

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
        showToast('Company created successfully')
      } else {
        await updateCompany(selected.id, payload)
        showToast('Company updated successfully')
      }
      setIsNew(false)
      setSelected(null)
      setForm(emptyForm)
      await load()
    } catch (err) {
      console.error('Save error:', err)
      showToast('Save failed: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCompany(deleteTarget.id)
      if (selected?.id === deleteTarget.id) {
        setSelected(null)
        setForm(emptyForm)
      }
      setDeleteTarget(null)
      showToast('Company deleted successfully')
      await load()
    } catch (err) {
      console.error('Delete error:', err)
      showToast('Delete failed: ' + err.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  const closeSidebar = () => {
    setSelected(null)
    setIsNew(false)
    setForm(emptyForm)
  }

  const riskLabel = (score) => {
    if (score == null) return { text: '—', color: 'text-text-muted' }
    if (score >= 70) return { text: `High (${score})`, color: 'text-red-500' }
    if (score >= 30) return { text: `Medium (${score})`, color: 'text-amber-500' }
    return { text: `Low (${score})`, color: 'text-emerald-500' }
  }

  const statusBadge = (status) => {
    const map = {
      Active: 'bg-emerald-500/10 text-emerald-500',
      Renewing: 'bg-amber-500/10 text-amber-500',
      Critical: 'bg-red-500/10 text-red-500',
      Paused: 'bg-text-muted/10 text-text-muted',
    }
    return map[status] || 'bg-text-muted/10 text-text-muted'
  }

  const formatCurrency = (n) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n || 0)

  const sidebarOpen = isNew || selected !== null

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-text">
      {/* Toast */}
      {toast && (
        <div className={`fixed right-6 top-20 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        }`}>
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Delete Modal */}
      <DeleteModal
        open={!!deleteTarget}
        name={deleteTarget?.company_name || ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <header className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-4 sm:px-8 sm:py-5">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold sm:text-2xl">Client Management</h2>
          <p className="mt-1 hidden text-sm text-text-muted sm:block">Manage profiles, risk assessments, and contract renewals.</p>
        </div>
        <button onClick={openNew} className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-dark sm:px-4 sm:text-sm">
          New Client
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mb-6 flex gap-4">
            <input
              className="w-full max-w-md rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Search clients by name..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-surface-alt text-xs font-semibold uppercase tracking-wider text-text-muted">
                      <th className="px-4 py-3 sm:px-6 sm:py-4">Company Name</th>
                      <th className="hidden px-4 py-3 sm:table-cell sm:px-6 sm:py-4">Contact</th>
                      <th className="hidden px-4 py-3 md:table-cell sm:px-6 sm:py-4">Contract Value</th>
                      <th className="px-4 py-3 sm:px-6 sm:py-4">Risk</th>
                      <th className="hidden px-4 py-3 sm:table-cell sm:px-6 sm:py-4">Status</th>
                      <th className="px-4 py-3 text-right sm:px-6 sm:py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {clients.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-sm text-text-muted">
                          No clients found.
                        </td>
                      </tr>
                    )}
                    {clients.map((c) => {
                      const risk = riskLabel(c.risk_score)
                      return (
                        <tr className="transition-colors hover:bg-hover" key={c.id}>
                          <td className="px-4 py-3 font-medium sm:px-6 sm:py-4">{c.company_name}</td>
                          <td className="hidden px-4 py-3 text-sm text-text-muted sm:table-cell sm:px-6 sm:py-4">{c.authorized_email}</td>
                          <td className="hidden px-4 py-3 text-sm font-medium md:table-cell sm:px-6 sm:py-4">{formatCurrency(c.contract_value)}</td>
                          <td className={`px-4 py-3 text-sm sm:px-6 sm:py-4 ${risk.color}`}>{risk.text}</td>
                          <td className="hidden px-4 py-3 text-sm sm:table-cell sm:px-6 sm:py-4">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadge(c.status)}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium sm:px-6 sm:py-4">
                            <button onClick={() => openEdit(c)} className="text-primary hover:text-primary-dark">
                              Edit
                            </button>
                            <button onClick={() => setDeleteTarget(c)} className="ml-3 text-red-500 hover:text-red-400">
                              Delete
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {sidebarOpen && (
          <aside className="z-10 flex h-full w-full shrink-0 flex-col overflow-hidden border-l border-border bg-surface sm:w-[420px]">
            <div className="border-b border-border px-6 py-5">
              <h3 className="text-lg font-bold">{isNew ? 'New Client' : 'Edit Client Profile'}</h3>
              {selected && <p className="mt-1 text-xs text-text-muted">ID: {selected.id.slice(0, 8)}</p>}
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Company Name</h4>
                <input
                  className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                />
              </div>
              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Authorized Email</h4>
                <input
                  className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={form.authorized_email}
                  onChange={(e) => setForm({ ...form, authorized_email: e.target.value })}
                  type="email"
                />
              </div>
              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Risk Score (0-100)</h4>
                <input
                  className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={form.risk_score}
                  onChange={(e) => setForm({ ...form, risk_score: e.target.value })}
                  type="number"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Communication Language</h4>
                <select
                  className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={form.communication_language}
                  onChange={(e) => setForm({ ...form, communication_language: e.target.value })}
                >
                  <option value="tr">Turkish</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 border-t border-border bg-surface-alt p-6">
              <button onClick={closeSidebar} className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-hover">
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
