import { useState } from 'react'
import MarketingLayout from '../components/MarketingLayout'
import { sendContactMessage } from '../api'
import { useToast } from '../contexts/ToastContext'

const initialForm = { name: '', email: '', company: '', message: '' }

export default function ContactPage() {
  const { success: toastSuccess, error: toastError } = useToast()
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)

  const inputCls = 'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary'
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toastError('Please fill in your name, email, and message.')
      return
    }
    if (!isValidEmail(form.email)) {
      toastError('Please enter a valid email address.')
      return
    }
    setSubmitting(true)
    try {
      await sendContactMessage(form)
      setForm(initialForm)
      toastSuccess('Your message has been sent to the RateGuard team.')
    } catch (err) {
      toastError(err.message || 'Message could not be sent.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MarketingLayout>
      <section className="relative overflow-hidden border-b border-border">
        <img
          alt="Office contact and business communication"
          className="absolute inset-0 h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=80"
        />
        <div className="absolute inset-0 bg-slate-950/70" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:px-10">
          <div className="max-w-3xl">
            <span className="text-sm font-bold uppercase tracking-wider text-primary">Contact</span>
            <h1 className="headline-font mt-3 text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              Tell us about your renewal workflow
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-200">
              Share your contract volume, team structure, or application needs. Your message is delivered directly to the RateGuard team.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <h2 className="headline-font text-3xl font-extrabold tracking-tight">How we can help</h2>
            <p className="text-base leading-7 text-text-muted">
              Contact us for product questions, onboarding planning, role setup, custom workflow needs, or demo requests.
            </p>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-sm font-bold">Direct recipient</p>
              <p className="mt-1 text-sm text-text-muted">mertucan44@gmail.com</p>
            </div>
          </div>

          <form noValidate onSubmit={submit} className="rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-muted">Name</label>
                <input className={inputCls} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-muted">Email</label>
                <input className={inputCls} required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-muted">Company</label>
              <input className={inputCls} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-muted">Message</label>
              <textarea
                className={`${inputCls} min-h-36 resize-y`}
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>
            <div className="mt-5 flex justify-center">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
              >
                {submitting ? 'Sending...' : 'Send message'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </MarketingLayout>
  )
}
