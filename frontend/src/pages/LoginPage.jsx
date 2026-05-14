import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { loginUser } from '../api'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { error: toastError } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await loginUser({ email, password })
      login(user)
      navigate('/dashboard')
    } catch (err) {
      toastError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="antialiased bg-mesh min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="geometric-overlay"></div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/10 to-transparent" />

      <div className="relative z-10 mb-8 flex flex-col items-center">
        <Link to="/" className="text-3xl font-bold tracking-tighter text-primary headline-font flex items-center gap-3">
          <span
            className="material-symbols-outlined text-4xl"
            data-icon="security"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            security
          </span>
          RateGuard
        </Link>
        <div className="mt-2 text-xs uppercase tracking-[0.3em] text-on-surface font-semibold opacity-80">
          Renewal Intelligence Platform
        </div>
      </div>

      <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-low shadow-2xl shadow-primary/10 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden border-r border-outline-variant/20 bg-surface-container-highest/60 p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              Secure access
            </span>
            <h1 className="headline-font mt-6 text-3xl font-extrabold tracking-tight text-on-surface">
              Continue managing renewals with full operational context.
            </h1>
            <p className="mt-4 text-sm leading-7 text-on-surface-variant">
              Sign in to review contract deadlines, approval queues, market-based calculations, client decisions, and company applications.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {['TCMB data', 'Role access', 'Audit logs', 'AI drafts'].map((item) => (
              <div key={item} className="rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-3">
                <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                <p className="mt-1 text-xs font-semibold text-on-surface">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="relative p-6 sm:p-10">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-[70px]"></div>
          <div className="relative z-10 mx-auto max-w-[420px]">
            <div className="text-center mb-8">
              <h2 className="font-headline text-2xl font-bold text-on-surface mb-2 tracking-tight">
                Sign In
              </h2>
              <p className="text-sm text-on-surface-variant">
                Enter your credentials to open your RateGuard workspace.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider ml-1 opacity-90">
                  Email Address
                </label>
                <div className="relative input-focus-effect rounded-xl transition-all duration-300">
                  <input
                    className="block w-full px-4 py-3 bg-surface-container-highest border border-outline-variant/20 rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 focus:border-transparent transition-all"
                    placeholder="name@company.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider opacity-90">
                    Password
                  </label>
                </div>
                <div className="relative input-focus-effect rounded-xl transition-all duration-300">
                  <input
                    className="block w-full px-4 pr-12 py-3 bg-surface-container-highest border border-outline-variant/20 rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 focus:border-transparent transition-all"
                    placeholder="********"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-on-surface-variant hover:text-on-surface transition-colors"
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    <span className="material-symbols-outlined text-[20px]" data-icon="visibility">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <input
                    className="h-4 w-4 rounded bg-surface-container-highest border-outline-variant/40 text-primary focus:ring-primary/20"
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                  />
                  <label
                    className="ml-2.5 block text-xs font-medium text-on-surface cursor-pointer opacity-90"
                    htmlFor="remember-me"
                  >
                    Remember me
                  </label>
                </div>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline decoration-primary/30 underline-offset-4 transition-all"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                className="w-full primary-gradient text-on-primary font-bold py-3.5 rounded-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:shadow-primary/30 text-base disabled:opacity-60"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
                <span className="material-symbols-outlined" data-icon="arrow_forward">
                  arrow_forward
                </span>
              </button>
            </form>

            <div className="mt-10 pt-6 border-t border-outline-variant/5 text-center">
              <p className="text-xs text-on-surface opacity-85">
                Don&apos;t have an account?
                <Link
                  to="/register"
                  className="text-primary font-semibold hover:underline decoration-primary/30 underline-offset-4 transition-all ml-1"
                >
                  Register
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Global Footer */}
      <footer className="mt-auto pt-16 pb-8 w-full flex flex-col md:flex-row justify-between items-center px-12 text-on-surface-variant font-['Inter'] text-[10px] uppercase tracking-[0.2em] opacity-50 hover:opacity-80 transition-opacity duration-500">
      <div className="mb-6 md:mb-0">
          © 2026 RateGuard Intelligence
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          <Link className="hover:text-primary transition-colors" to="/privacy-policy">Privacy</Link>
          <Link className="hover:text-primary transition-colors" to="/terms-of-service">Terms</Link>
          <Link className="hover:text-primary transition-colors" to="/contact">Contact</Link>
        </div>
      </footer>
    </div>
  )
}
