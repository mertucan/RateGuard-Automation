import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

export default function SolutionsPage() {
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
              <Link to="/solutions" className="text-primary font-medium transition-colors">Solutions</Link>
              <Link to="/about-us" className="text-text-muted hover:text-text transition-colors">About Us</Link>
              <Link to="/key-benefits" className="text-text-muted hover:text-text transition-colors">Key Benefits</Link>
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
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6">Our Solutions</h1>
          <p className="text-text-muted text-lg leading-relaxed mb-12">
            Discover how RateGuard's autonomous systems can help your business manage complex data, eliminate calculation errors, and stay compliant with ever-changing regulations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-surface-alt border border-border rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
              <span className="material-symbols-outlined text-2xl">apartment</span>
            </div>
            <h3 className="text-xl font-bold mb-3">For Enterprises</h3>
            <p className="text-text-muted mb-6">Automate thousands of contracts across multiple departments. Ensure perfect alignment with corporate policies and central bank data.</p>
            <Link to="/register" className="text-primary font-medium hover:underline flex items-center gap-1">
              Start Enterprise Trial <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
          <div className="bg-surface-alt border border-border rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
              <span className="material-symbols-outlined text-2xl">storefront</span>
            </div>
            <h3 className="text-xl font-bold mb-3">For Growing Businesses</h3>
            <p className="text-text-muted mb-6">Protect your margins from inflation without hiring a large legal and finance team. RateGuard handles the complexity for you.</p>
            <Link to="/register" className="text-primary font-medium hover:underline flex items-center gap-1">
              Get Started <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
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