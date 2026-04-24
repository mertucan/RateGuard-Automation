import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

export default function KeyBenefitsPage() {
  const { dark, toggle } = useTheme();

  return (
    <div className="bg-bg text-text min-h-screen font-display selection:bg-primary selection:text-white">
      <nav className="bg-surface/95 backdrop-blur-md fixed top-0 w-full z-50 border-b border-border shadow-sm transition-all duration-300">
        <div className="flex justify-between items-center h-16 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl">shield</span>
              <span className="text-2xl font-extrabold tracking-tighter">RateGuard</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link to="/solutions" className="text-text-muted hover:text-text transition-colors">Solutions</Link>
              <Link to="/about-us" className="text-text-muted hover:text-text transition-colors">About Us</Link>
              <Link to="/key-benefits" className="text-primary font-medium transition-colors">Key Benefits</Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggle}
              className="flex h-10 w-10 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-hover hover:text-text"
              title={dark ? 'Light mode' : 'Dark mode'}
            >
              <span className="material-symbols-outlined text-[20px]">
                {dark ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <Link to="/login" className="text-text hover:text-primary transition-colors font-medium">Log In</Link>
            <Link to="/register" className="bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary-dark transition-colors shadow-sm font-medium">Get Started</Link>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6">Why RateGuard?</h1>
          <p className="text-text-muted text-lg leading-relaxed">
            The traditional contract lifecycle is broken. Here is how our autonomous systems deliver immediate value to your organization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
          <div className="flex gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
              <span className="material-symbols-outlined text-2xl">trending_up</span>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Maximize Revenue</h3>
              <p className="text-text-muted leading-relaxed">Never miss an inflation-adjusted price increase. Our live data integration ensures your contracts are always priced correctly according to current economic conditions.</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <span className="material-symbols-outlined text-2xl">verified_user</span>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Zero Compliance Risk</h3>
              <p className="text-text-muted leading-relaxed">Automated audits verify that every clause, date, and condition meets both internal policies and external legal requirements.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <span className="material-symbols-outlined text-2xl">timer</span>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Save Thousands of Hours</h3>
              <p className="text-text-muted leading-relaxed">What used to take your legal and finance teams weeks can now be completed in seconds with our AI-powered analysis engine.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <span className="material-symbols-outlined text-2xl">hub</span>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Centralized Truth</h3>
              <p className="text-text-muted leading-relaxed">A single, secure repository for all your critical agreements, with role-based access control and detailed audit logging.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-surface w-full border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 py-16 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="flex flex-col gap-4 pr-8">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">shield</span>
              <span className="text-xl font-extrabold tracking-tighter">RateGuard</span>
            </div>
            <p className="text-text-muted text-sm leading-relaxed">Calculated Security. Autonomous contract management platform preventing financial loss through advanced AI and live data integration.</p>
            <p className="text-text-muted/60 text-xs mt-4">© 2026 RateGuard. All rights reserved.</p>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-text mb-2">Platform</h4>
            <Link to="/solutions" className="text-text-muted hover:text-primary transition-colors text-sm">Solutions</Link>
            <Link to="/key-benefits" className="text-text-muted hover:text-primary transition-colors text-sm">Key Benefits</Link>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-text mb-2">Company</h4>
            <Link to="/about-us" className="text-text-muted hover:text-primary transition-colors text-sm">About Us</Link>
            <Link to="/register" className="text-text-muted hover:text-primary transition-colors text-sm">Contact</Link>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-text mb-2">Legal</h4>
            <Link to="/register" className="text-text-muted hover:text-primary transition-colors text-sm">Privacy Policy</Link>
            <Link to="/register" className="text-text-muted hover:text-primary transition-colors text-sm">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}