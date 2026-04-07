import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onChange = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Sifreler eslesmiyor.');
      return;
    }
    if (form.password.length < 8) {
      setError('Sifre en az 8 karakter olmali.');
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: 'client',
      });
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Kayit olusturulamadi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-mesh font-body text-on-surface min-h-screen flex flex-col items-center justify-center antialiased px-4">
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
          <div className="mt-2 text-[10px] uppercase tracking-[0.3em] text-on-surface font-semibold opacity-80">
            Sovereign Intelligence
          </div>
        </div>
      </header>

      <main className="w-full max-w-[440px] relative">
        <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/10 to-transparent rounded-xl blur-sm opacity-20"></div>
        <div className="relative bg-surface-container-low border border-outline-variant/10 rounded-xl p-10 sovereign-glow">
          <div className="mb-8">
            <h2 className="font-headline text-xl font-bold text-on-surface">Establish Node</h2>
            <p className="text-sm text-on-surface mt-1 opacity-90">Register institutional credentials for secure terminal access.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider opacity-90">Full Name</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                  person
                </span>
                <input
                  className="w-full bg-surface-container-highest border-none rounded-lg py-3 pl-11 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 transition-all"
                  placeholder="Alexander Thorne"
                  type="text"
                  value={form.full_name}
                  onChange={onChange('full_name')}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider opacity-90">Institutional Email</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                  alternate_email
                </span>
                <input
                  className="w-full bg-surface-container-highest border-none rounded-lg py-3 pl-11 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 transition-all"
                  placeholder="a.thorne@sovereign.int"
                  type="email"
                  value={form.email}
                  onChange={onChange('email')}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider opacity-90">Secure Access Key</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                  vpn_key
                </span>
                <input
                  className="w-full bg-surface-container-highest border-none rounded-lg py-3 pl-11 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 transition-all"
                  placeholder="••••••••••••"
                  type="password"
                  value={form.password}
                  onChange={onChange('password')}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider opacity-90">Confirm Access Key</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                  vpn_key
                </span>
                <input
                  className="w-full bg-surface-container-highest border-none rounded-lg py-3 pl-11 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 transition-all"
                  placeholder="••••••••••••"
                  type="password"
                  value={form.confirmPassword}
                  onChange={onChange('confirmPassword')}
                  required
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button className="w-full group mt-4 relative overflow-hidden bg-gradient-to-br from-primary to-[#357df1] text-on-primary font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/10 disabled:opacity-60" type="submit" disabled={loading}>
              <span>{loading ? 'Creating...' : 'Create Account'}</span>
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-outline-variant/5 text-center">
            <p className="text-xs text-on-surface opacity-85">
              Already have a terminal key? 
              <Link to="/login" className="text-primary font-semibold hover:underline decoration-primary/30 underline-offset-4 transition-all ml-1">
                Login
              </Link>
            </p>
          </div>
        </div>
      </main>

      <footer className="mt-auto w-full py-10 flex flex-col md:flex-row items-center justify-between px-12 opacity-40">
        <div className="text-[10px] font-headline uppercase tracking-[0.2em] text-on-surface-variant mb-4 md:mb-0">
          © 2026 RateGuard Intelligence. All rights reserved.
        </div>
        <div className="flex gap-8">
          <a className="text-[10px] font-headline uppercase tracking-[0.2em] text-on-surface-variant hover:text-primary transition-colors" href="#">Terms of Service</a>
          <a className="text-[10px] font-headline uppercase tracking-[0.2em] text-on-surface-variant hover:text-primary transition-colors" href="#">Privacy Policy</a>
          <a className="text-[10px] font-headline uppercase tracking-[0.2em] text-on-surface-variant hover:text-primary transition-colors" href="#">Security Compliance</a>
        </div>
      </footer>
    </div>
  );
}