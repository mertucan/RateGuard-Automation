import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { registerUser } from '../api'

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'Very Weak', color: 'bg-red-500' }
  if (score === 2) return { score, label: 'Weak', color: 'bg-orange-500' }
  if (score === 3) return { score, label: 'Fair', color: 'bg-yellow-500' }
  if (score === 4) return { score, label: 'Strong', color: 'bg-emerald-500' }
  return { score, label: 'Very Strong', color: 'bg-emerald-600' }
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { error: toastError, success: toastSuccess } = useToast()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'company_admin',
    company_name: '',
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const onChange = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))
  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (form.password !== form.confirmPassword) {
      toastError('Passwords do not match. Please re-enter your password.')
      return
    }
    if (form.password.length < 8) {
      toastError('Password must be at least 8 characters long.')
      return
    }
    if (passwordStrength.score < 2) {
      toastError('Password is too weak. Add uppercase letters, numbers, or symbols.')
      return
    }
    if (form.role === 'company_admin' && !form.company_name.trim()) {
      toastError('Company name is required for Company Administrator accounts.')
      return
    }

    setLoading(true)
    try {
      await registerUser({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: form.role,
        company_name: form.role === 'company_admin' ? form.company_name : undefined,
      })
      toastSuccess('Account created successfully! You can now sign in.', 6000)
      navigate('/login')
    } catch (err) {
      toastError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg py-3 pl-11 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 transition-all'

  return (
    <div className="bg-mesh font-body text-on-surface min-h-screen flex flex-col items-center justify-center selection:bg-primary selection:text-on-primary antialiased px-4">
      <header className="mb-12 text-center mt-8">
        <div className="flex flex-col items-center gap-2">
          <div className="text-3xl font-bold tracking-tighter text-primary font-headline flex items-center gap-3">
            <span
              className="material-symbols-outlined text-4xl"
              data-icon="security"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              security
            </span>
            RateGuard
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.3em] text-on-surface-variant font-semibold opacity-70">
            Sovereign Intelligence
          </div>
        </div>
      </header>

      <main className="w-full max-w-[440px] relative">
        <div className="absolute -inset-0.5 bg-linear-to-br from-primary/10 to-transparent rounded-xl blur-sm opacity-20" />
        <div className="relative bg-surface-container-low border border-outline-variant/10 rounded-xl p-10 sovereign-glow">
          <div className="mb-8">
            <h2 className="font-headline text-xl font-bold text-on-surface">Establish Node</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Register institutional credentials for secure terminal access.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider opacity-90">
                Account Type
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                  badge
                </span>
                <select className={inputCls} value={form.role} onChange={onChange('role')}>
                  <option value="company_admin">Company Administrator</option>
                  <option value="user">User</option>
                </select>
              </div>
            </div>

            {form.role === 'company_admin' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider opacity-90">
                  Company Name
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                    business
                  </span>
                  <input
                    className={inputCls}
                    placeholder="Acme Corporation"
                    type="text"
                    value={form.company_name}
                    onChange={onChange('company_name')}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider">Full Name</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                  person
                </span>
                <input
                  className={inputCls}
                  placeholder="Alexander Thorne"
                  type="text"
                  value={form.full_name}
                  onChange={onChange('full_name')}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider">Institutional Email</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                  alternate_email
                </span>
                <input
                  className={inputCls}
                  placeholder="a.thorne@sovereign.int"
                  type="email"
                  value={form.email}
                  onChange={onChange('email')}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider">Secure Access Key</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                  vpn_key
                </span>
                <input
                  className={inputCls}
                  placeholder="Minimum 8 characters"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={onChange('password')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {form.password && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          i <= passwordStrength.score ? passwordStrength.color : 'bg-outline-variant/20'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-medium ${
                      passwordStrength.score <= 1 ? 'text-red-500' :
                      passwordStrength.score === 2 ? 'text-orange-500' :
                      passwordStrength.score === 3 ? 'text-yellow-500' :
                      'text-emerald-500'
                    }`}>
                      {passwordStrength.label}
                    </p>
                    <p className="text-[10px] text-on-surface opacity-50">
                      Use uppercase, numbers & symbols to strengthen
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider">Confirm Access Key</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                  vpn_key
                </span>
                <input
                  className={inputCls}
                  placeholder="............."
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={onChange('confirmPassword')}
                  required
                />
              </div>
            </div>

            <button
              className="w-full group mt-4 relative overflow-hidden bg-linear-to-br from-primary to-[#357df1] text-on-primary font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/10"
              type="submit"
            >
              <span>Create Account</span>
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-outline-variant/5 text-center">
            <p className="text-xs text-on-surface-variant">
              Already have a terminal key?
              <Link to="/login" className="text-primary font-semibold hover:underline decoration-primary/30 underline-offset-4 transition-all ml-1">
                Login
              </Link>
            </p>
          </div>
        </div>
      </main>

      <footer className="mt-auto w-full py-10 flex justify-center items-center px-12 opacity-40">
        <div className="text-[10px] font-headline uppercase tracking-[0.2em] text-on-surface-variant">
          &copy; 2026 RateGuard
        </div>
      </footer>
    </div>
  )
}
