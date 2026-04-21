import { useEffect, useState, useCallback } from 'react'
import { getCompanies, deleteCompany } from '../api'
import Spinner from '../components/Spinner'
import { useAuth } from '../contexts/AuthContext'

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
            <h3 className="text-lg font-bold">Remove company</h3>
            <p className="text-sm text-text-muted">Contracts with this company will be removed.</p>
          </div>
        </div>
        <p className="mb-4 text-sm text-text">
          Remove <strong>{name}</strong>? All contracts between your organization and this company will be deleted.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-hover">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50">
            {loading ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ClientManagementPage() {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCompanies()
      setClients(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Companies load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCompany(deleteTarget.id)
      setDeleteTarget(null)
      showToast('Company removed and contracts deleted')
      await load()
    } catch (err) {
      console.error('Delete error:', err)
      showToast('Delete failed: ' + err.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  const formatCurrency = (n) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n || 0)

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

      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4 py-4 sm:px-8 sm:py-5">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold sm:text-2xl">Client Management</h2>
          <p className="mt-1 hidden text-sm text-text-muted sm:block">
            Companies you have active contracts with. Remove a company to delete all contracts between you.
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
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
                    <th className="px-4 py-3 text-right sm:px-6 sm:py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-sm text-text-muted">
                        <span className="material-symbols-outlined mb-2 block text-3xl">business</span>
                        No companies found. Create a contract on the <strong className="text-text">Contracts</strong> page to see companies here.
                      </td>
                    </tr>
                  )}
                  {clients.map((c) => (
                    <tr className="transition-colors hover:bg-hover" key={c.id}>
                      <td className="px-4 py-3 font-medium sm:px-6 sm:py-4">
                        <div className="flex items-center gap-3">
                          <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary sm:flex">
                            {(c.company_name || '?')[0].toUpperCase()}
                          </div>
                          <span>{c.company_name}</span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-text-muted sm:table-cell sm:px-6 sm:py-4">{c.authorized_email}</td>
                      <td className="hidden px-4 py-3 text-sm font-medium md:table-cell sm:px-6 sm:py-4">{formatCurrency(c.contract_value)}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium sm:px-6 sm:py-4">
                        <button type="button" onClick={() => setDeleteTarget(c)} className="text-red-500 hover:text-red-400 font-medium">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
