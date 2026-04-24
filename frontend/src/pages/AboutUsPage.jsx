import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

export default function AboutUsPage() {
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
              <Link to="/about-us" className="text-primary font-medium transition-colors">About Us</Link>
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
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6">About Us</h1>
          <p className="text-text-muted text-lg leading-relaxed mb-8">
            RateGuard was founded with a single mission: to eliminate the friction and financial loss associated with manual contract management. 
          </p>
          <p className="text-text-muted text-lg leading-relaxed mb-8">
            In today's fast-paced economic environment, relying on static spreadsheets and manual reviews means inevitable errors, missed renewals, and lost revenue. Our team of legal experts, financial analysts, and software engineers came together to build a platform that acts as your autonomous, error-free auditor.
          </p>
          
          <div className="bg-surface-alt border border-border p-8 rounded-2xl mt-12">
            <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
            <p className="text-text-muted">
              To be the standard layer of security for corporate financial agreements, ensuring 100% compliance and zero calculation errors worldwide.
            </p>
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