import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getUsers, createUser, deleteUser } from '../api'
import { PageLoader } from '../components/Spinner'

const ROLE_OPTIONS = [
  { value: 'finance', label: 'Finance' },
  { value: 'sales', label: 'Sales' },
  { value: 'client', label: 'Client' },
]

const ROLE_BADGES = {
  super_admin: 'bg-red-500/10 text-red-500',
  company_admin: 'bg-purple-500/10 text-purple-500',
  finance: 'bg-amber-500/10 text-amber-500',
  sales: 'bg-blue-500/10 text-blue-500',
  client: 'bg-emerald-500/10 text-emerald-500',
}

export default function TeamManagementPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'finance' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    try {
      const params = {}
      if (user?.role === 'company_admin' && user?.company_id) {
        params.company_id = user.company_id
      }
      const data = await getUsers(params)
      setUsers(data)
    } catch (err) {
      console.error('Users load error:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async () => {
    setSaving(true)
    try {
      await createUser({
        ...form,
        company_id: user?.company_id || null,
      })
      setShowForm(false)
      setForm({ full_name: '', email: '', password: '', role: 'finance' })
      showToast('User created successfully')
      await load()
    } catch (err) {
      showToast('Failed: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (userId) => {
    try {
      await deleteUser(userId)
      showToast('User removed')
      await load()
    } catch (err) {
      showToast('Failed: ' + err.message, 'error')
    }
  }

  if (loading) return <PageLoader />

  const inputCls =
    'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary'

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-text">
      {toast && (
        <div
          className={`fixed right-6 top-20 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          {toast.msg}
        </div>
      )}

      <header className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-4 sm:px-8 sm:py-5">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold sm:text-2xl">Team Management</h2>
          <p className="mt-1 hidden text-sm text-text-muted sm:block">
            Manage your team members and their roles.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-dark sm:px-4 sm:text-sm"
        >
          {showForm ? 'Cancel' : 'Add Member'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {showForm && (
            <div className="rounded-xl border border-primary/20 bg-primary-soft p-4 sm:p-6">
              <h3 className="mb-4 text-lg font-bold">Add Team Member</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
                    Full Name
                  </label>
                  <input
                    className={inputCls}
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
                    Email
                  </label>
                  <input
                    className={inputCls}
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
                    Password
                  </label>
                  <input
                    className={inputCls}
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
                    Role
                  </label>
                  <select
                    className={inputCls}
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={handleCreate}
                disabled={saving || !form.full_name || !form.email || !form.password}
                className="mt-4 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create User'}
              </button>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface-alt text-xs font-semibold uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-3 sm:px-6 sm:py-4">Name</th>
                  <th className="hidden px-4 py-3 sm:table-cell sm:px-6 sm:py-4">Email</th>
                  <th className="px-4 py-3 sm:px-6 sm:py-4">Role</th>
                  <th className="hidden px-4 py-3 sm:table-cell sm:px-6 sm:py-4">Joined</th>
                  <th className="px-4 py-3 text-right sm:px-6 sm:py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-text-muted">
                      No team members found.
                    </td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-hover">
                    <td className="px-4 py-3 font-medium sm:px-6 sm:py-4">{u.full_name}</td>
                    <td className="hidden px-4 py-3 text-sm text-text-muted sm:table-cell sm:px-6 sm:py-4">
                      {u.email}
                    </td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          ROLE_BADGES[u.role] || 'bg-text-muted/10 text-text-muted'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-text-muted sm:table-cell sm:px-6 sm:py-4">
                      {new Date(u.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-right sm:px-6 sm:py-4">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="text-xs text-red-500 hover:text-red-400 font-medium"
                        >
                          Remove
                        </button>
                      )}
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
