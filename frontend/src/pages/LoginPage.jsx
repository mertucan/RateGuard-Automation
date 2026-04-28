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
    <div className="antialiased bg-mesh min-h-screen flex flex-col items-center justify-center p-6 relative">
      <div className="geometric-overlay"></div>

      <div className="relative z-10 mb-10 flex flex-col items-center">
        <div className="text-3xl font-bold tracking-tighter text-primary headline-font flex items-center gap-3">
          <span
            className="material-symbols-outlined text-4xl"
            data-icon="security"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            security
          </span>
          RateGuard
        </div>
        <div className="mt-2 text-xs uppercase tracking-[0.3em] text-on-surface font-semibold opacity-80">
          Contract Management Platform
        </div>
      </div>

      <div className="relative z-10 w-full max-w-[440px]">
        <div className="relative bg-surface-container-low border border-outline-variant/10 rounded-xl p-10 sovereign-glow">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full"></div>

          <div className="relative z-10">
            <div className="text-center mb-8">
              <h2 className="font-headline text-2xl font-bold text-on-surface mb-2 tracking-tight">
                Sign In
              </h2>
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
          <a className="hover:text-primary transition-colors" href="#">Privacy</a>
          <a className="hover:text-primary transition-colors" href="#">Security</a>
          <a className="hover:text-primary transition-colors" href="#">Compliance</a>
        </div>
      </footer>
    </div>
  )
}
