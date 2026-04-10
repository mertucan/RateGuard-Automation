import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { forgotPassword, resetPassword } from '../api'

const STEPS = { EMAIL: 'email', CODE: 'code', DONE: 'done' }

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { success: toastSuccess, error: toastError } = useToast()

  const [step, setStep] = useState(STEPS.EMAIL)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSendCode = async (e) => {
    e.preventDefault()
    if (!email.trim()) { toastError('Please enter your email address.'); return }
    setLoading(true)
    try {
      await forgotPassword(email.trim().toLowerCase())
      toastSuccess('Reset code sent! Check your inbox (and spam folder).', 6000)
      setStep(STEPS.CODE)
    } catch (err) {
      toastError(err.message || 'Failed to send reset code.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (code.length !== 6 || !/^\d+$/.test(code)) {
      toastError('Please enter the 6-digit numeric code from your email.')
      return
    }
    if (newPassword.length < 8) {
      toastError('New password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      toastError('Passwords do not match. Please re-enter.')
      return
    }
    setLoading(true)
    try {
      await resetPassword({ email: email.trim().toLowerCase(), code, new_password: newPassword })
      toastSuccess('Password updated successfully! You can now sign in.', 6000)
      setStep(STEPS.DONE)
    } catch (err) {
      toastError(err.message || 'Failed to reset password.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'block w-full px-4 py-3 bg-surface-container-highest border border-outline-variant/20 rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 focus:border-transparent transition-all'

  return (
    <div className="antialiased bg-mesh min-h-screen flex flex-col items-center justify-center p-6 relative">
      <div className="geometric-overlay" />

      {/* Logo */}
      <div className="relative z-10 mb-10 flex flex-col items-center">
        <div className="text-3xl font-bold tracking-tighter text-primary headline-font flex items-center gap-3">
          <span
            className="material-symbols-outlined text-4xl"
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
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full" />

          <div className="relative z-10">

            {/* ── STEP 1: Enter email ── */}
            {step === STEPS.EMAIL && (
              <>
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <span className="material-symbols-outlined text-3xl text-primary"
                      style={{ fontVariationSettings: "'FILL' 1" }}>lock_reset</span>
                  </div>
                  <h2 className="font-headline text-2xl font-bold text-on-surface tracking-tight">Forgot Password</h2>
                  <p className="mt-2 text-sm text-on-surface opacity-60">
                    Enter your email and we&apos;ll send you a 6-digit reset code.
                  </p>
                </div>

                <form className="space-y-5" onSubmit={handleSendCode}>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider ml-1 opacity-90">
                      Email Address
                    </label>
                    <input
                      className={inputCls}
                      placeholder="name@company.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <button
                    className="w-full primary-gradient text-on-primary font-bold py-3.5 rounded-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/20 text-base disabled:opacity-60"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send Reset Code'}
                    <span className="material-symbols-outlined">send</span>
                  </button>
                </form>
              </>
            )}

            {/* ── STEP 2: Enter code + new password ── */}
            {step === STEPS.CODE && (
              <>
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                    <span className="material-symbols-outlined text-3xl text-emerald-400"
                      style={{ fontVariationSettings: "'FILL' 1" }}>mark_email_read</span>
                  </div>
                  <h2 className="font-headline text-2xl font-bold text-on-surface tracking-tight">Check Your Email</h2>
                  <p className="mt-2 text-sm text-on-surface opacity-60">
                    We sent a 6-digit code to <strong className="opacity-90">{email}</strong>.
                    Enter it below with your new password.
                  </p>
                </div>

                <form className="space-y-5" onSubmit={handleResetPassword}>
                  {/* Code input */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider ml-1 opacity-90">
                      6-Digit Code
                    </label>
                    <input
                      className={`${inputCls} text-center text-2xl font-bold tracking-[0.6em]`}
                      placeholder="000000"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      autoFocus
                    />
                  </div>

                  {/* New password */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider ml-1 opacity-90">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        className={`${inputCls} pr-12`}
                        placeholder="Minimum 8 characters"
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                      <button type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-on-surface-variant hover:text-on-surface transition-colors"
                        onClick={() => setShowNew((v) => !v)}>
                        <span className="material-symbols-outlined text-[20px]">
                          {showNew ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Confirm new password */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider ml-1 opacity-90">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        className={`${inputCls} pr-12`}
                        placeholder="Repeat your new password"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <button type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-on-surface-variant hover:text-on-surface transition-colors"
                        onClick={() => setShowConfirm((v) => !v)}>
                        <span className="material-symbols-outlined text-[20px]">
                          {showConfirm ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <button
                    className="w-full primary-gradient text-on-primary font-bold py-3.5 rounded-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/20 text-base disabled:opacity-60"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Reset Password'}
                    <span className="material-symbols-outlined">lock_reset</span>
                  </button>

                  <button
                    type="button"
                    className="w-full text-xs text-on-surface opacity-60 hover:opacity-100 transition-opacity"
                    onClick={() => setStep(STEPS.EMAIL)}
                  >
                    ← Resend code to a different email
                  </button>
                </form>
              </>
            )}

            {/* ── STEP 3: Success ── */}
            {step === STEPS.DONE && (
              <div className="text-center py-4">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                  <span className="material-symbols-outlined text-4xl text-emerald-400"
                    style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                </div>
                <h2 className="font-headline text-2xl font-bold text-on-surface tracking-tight mb-2">
                  Password Updated!
                </h2>
                <p className="text-sm text-on-surface opacity-60 mb-8">
                  Your password has been reset successfully. You can now sign in with your new password.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full primary-gradient text-on-primary font-bold py-3.5 rounded-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/20 text-base"
                >
                  Go to Sign In
                  <span className="material-symbols-outlined">login</span>
                </button>
              </div>
            )}

            {/* Back to login link */}
            {step !== STEPS.DONE && (
              <div className="mt-8 pt-6 border-t border-outline-variant/5 text-center">
                <p className="text-xs text-on-surface opacity-85">
                  Remember your password?
                  <Link
                    to="/login"
                    className="text-primary font-semibold hover:underline decoration-primary/30 underline-offset-4 transition-all ml-1"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-auto pt-16 pb-8 w-full flex justify-center items-center px-12 text-on-surface-variant font-['Inter'] text-[10px] uppercase tracking-[0.2em] opacity-50">
        <div>&copy; 2026 RateGuard</div>
      </footer>
    </div>
  )
}
