import React from 'react';
import { Link } from 'react-router-dom';

export default function LoginPage() {
  return (
    <div className="antialiased selection:bg-primary selection:text-on-primary mesh-background min-h-screen flex flex-col items-center justify-center p-6 relative">
      <div className="geometric-overlay"></div>
      
      {/* Branding */}
      <div className="relative z-10 mb-12 flex flex-col items-center">
        <div className="text-3xl font-bold tracking-tighter text-[#adc6ff] headline-font flex items-center gap-3">
          <span 
            className="material-symbols-outlined text-4xl" 
            data-icon="security" 
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            security
          </span>
          RateGuard
        </div>
        <div className="mt-2 text-xs uppercase tracking-[0.3em] text-outline font-semibold opacity-70">
          Sovereign Intelligence
        </div>
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-xl">
        <div className="glass-card rounded-[2rem] p-8 md:p-12 shadow-2xl overflow-hidden relative">
          {/* Subtle accent glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full"></div>
          
          <div className="relative z-10">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold headline-font text-on-surface mb-3 tracking-tight">Portal Access</h2>
              <p className="text-on-surface-variant max-w-xs mx-auto text-sm leading-relaxed">
                Enter your institutional credentials to access the terminal.
              </p>
            </div>

            <form className="space-y-6">
              {/* Institutional Email */}
              <div className="space-y-2 group">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-outline ml-1">
                  Institutional Email
                </label>
                <div className="relative input-focus-effect rounded-xl transition-all duration-300">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-outline group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]" data-icon="corporate_fare">corporate_fare</span>
                  </span>
                  <input 
                    className="block w-full pl-12 pr-4 py-4 bg-surface-container-highest/50 border border-outline-variant/20 rounded-xl text-on-surface focus:ring-0 focus:border-primary/40 placeholder-outline/30 transition-all text-sm" 
                    placeholder="name@institution.com" 
                    type="email"
                  />
                </div>
              </div>

              {/* Access Key */}
              <div className="space-y-2 group">
                <div className="flex justify-between items-center ml-1">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-outline">
                    Access Key
                  </label>
                  <a className="text-[11px] font-bold uppercase tracking-widest text-primary hover:text-primary-fixed transition-colors" href="#">
                    Recovery
                  </a>
                </div>
                <div className="relative input-focus-effect rounded-xl transition-all duration-300">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-outline group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]" data-icon="key">key</span>
                  </span>
                  <input 
                    className="block w-full pl-12 pr-12 py-4 bg-surface-container-highest/50 border border-outline-variant/20 rounded-xl text-on-surface focus:ring-0 focus:border-primary/40 placeholder-outline/30 transition-all text-sm" 
                    placeholder="••••••••••••" 
                    type="password"
                  />
                  <button className="absolute inset-y-0 right-0 pr-4 flex items-center text-outline hover:text-on-surface transition-colors" type="button">
                    <span className="material-symbols-outlined text-[20px]" data-icon="visibility">visibility</span>
                  </button>
                </div>
              </div>

              {/* Remember Me & Policy */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <input 
                    className="h-4 w-4 rounded bg-surface-container-highest border-outline-variant/40 text-primary focus:ring-primary/20" 
                    id="remember-me" 
                    name="remember-me" 
                    type="checkbox"
                  />
                  <label className="ml-2.5 block text-xs font-medium text-on-surface-variant cursor-pointer" htmlFor="remember-me">
                    Secure Session
                  </label>
                </div>
              </div>


              <button className="w-full primary-gradient text-on-primary font-bold py-4 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-primary/20 hover:shadow-primary/30 text-base" type="submit">
                Secure Login
                <span className="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
              </button>
            </form>

            {/* Navigation Redirect (Register'a Yönlendirme) */}
            <div className="mt-10 pt-6 border-t border-outline-variant/5 text-center">
              <p className="text-xs text-on-surface-variant">
                Don't have an account? 
                <Link to="/register" className="text-primary font-semibold hover:underline decoration-primary/30 underline-offset-4 transition-all ml-1">
                  Register
                </Link>
              </p>
            </div>

          </div>
        </div>

        {/* Warning Footer */}
        <div className="mt-8 text-center px-4">
          <p className="text-[11px] text-on-surface-variant/60 leading-relaxed uppercase tracking-widest">
            Authorized personnel only. <br className="hidden md:block"/>
            System access is monitored and recorded for security compliance.
          </p>
        </div>
      </div>

      {/* Global Footer */}
      <footer className="mt-auto pt-16 pb-8 w-full flex flex-col md:flex-row justify-between items-center px-12 text-[#adc6ff] font-['Inter'] text-[10px] uppercase tracking-[0.2em] opacity-40 hover:opacity-80 transition-opacity duration-500">
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
  );
}