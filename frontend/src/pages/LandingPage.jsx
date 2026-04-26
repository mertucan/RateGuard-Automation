import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

export default function LandingPage() {
  const { dark, toggle } = useTheme();

  return (
    <div className="bg-bg text-text min-h-screen font-display selection:bg-primary selection:text-white">
      <nav className="bg-surface/95 backdrop-blur-md fixed top-0 w-full z-50 border-b border-border shadow-sm transition-all duration-300">
        <div className="flex justify-between items-center h-16 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl">shield</span>
              <span className="text-2xl font-extrabold tracking-tighter">RateGuard</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <Link to="/solutions" className="text-text-muted hover:text-text transition-colors">Solutions</Link>
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

      <main className="pt-16">
        <section className="bg-primary text-white py-24 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-primary to-primary"></div>
          <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-8 pr-0 lg:pr-8">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
                Prevent Financial Loss with Autonomous Contract Management
              </h1>
              <p className="text-blue-100 max-w-xl text-lg leading-relaxed">
                Eliminate forgotten contracts and calculation errors during high inflation periods. With central bank integration and AI, you are always in control.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link to="/register" className="bg-white text-primary px-8 py-3.5 rounded-lg font-semibold text-base hover:bg-gray-100 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                  Schedule a Demo
                </Link>
                <Link to="/solutions" className="border border-white/40 text-white px-8 py-3.5 rounded-lg font-semibold text-base hover:bg-white/10 transition-all flex items-center gap-2">
                  Learn More
                </Link>
              </div>
            </div>
            <div className="relative w-full aspect-video rounded-2xl border border-white/20 overflow-hidden bg-primary-dark shadow-2xl flex items-center justify-center transform hover:scale-[1.02] transition-transform duration-500">
              <img alt="Modern abstract 3d rendering of data security and management" className="w-full h-full object-cover opacity-90" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAnlo2eVA_d9Md3bwSINOhx8rFYlIjABkD6NyhvNaN3TC-lQndUJLpkqwvYyJsJ7aFpvsCMZNNXwQGelsbpH3kSRIg0kwnFn4aFegYiolmvqxpc2rXmN3Q0U_AVPtMKTbdKYD_4_uXYAQfGgj_EOgb6fUpp6M9oBZal4ts9wTc2kLJTNbeeHvRbzNL7eMovdjVzjtoMNdfy09Oe1Psaw_PXAUoerc2rO1Sv2XP8uSaXvYAaQwIipuTed7-A4mEV3T8_vggJSsvBE1E" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent"></div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-surface relative z-20">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="mb-16 text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-text mb-4 tracking-tight">Calculated Security</h2>
              <p className="text-text-muted text-lg">Manage complex data with autonomous systems, reduce human error to zero.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-surface-alt border border-border rounded-2xl p-8 text-text hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group">
                <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-500 text-primary">
                  <span className="material-symbols-outlined text-[150px]">radar</span>
                </div>
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-3xl">radar</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">Automatic Detection</h3>
                  <p className="text-text-muted leading-relaxed">
                    Upload all your contracts to the system. Renewal dates and critical clauses are automatically classified and tracked by AI.
                  </p>
                </div>
              </div>
              <div className="bg-surface-alt border border-border rounded-2xl p-8 text-text hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group">
                <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-500 text-primary">
                  <span className="material-symbols-outlined text-[150px]">sync</span>
                </div>
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-3xl">sync</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">Live Data Sync</h3>
                  <p className="text-text-muted leading-relaxed">
                    Directly apply real-time exchange rate and inflation data to your contracts through official institution integrations.
                  </p>
                </div>
              </div>
              <div className="bg-surface-alt border border-border rounded-2xl p-8 text-text hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group">
                <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-500 text-primary">
                  <span className="material-symbols-outlined text-[150px]">psychology</span>
                </div>
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-3xl">edit_document</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">AI Powered Drafts</h3>
                  <p className="text-text-muted leading-relaxed">
                    Generate optimized new contract drafts based on comprehensive risk analysis in a matter of seconds.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-bg border-t border-border">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1 relative rounded-2xl overflow-hidden border border-border shadow-xl group">
                <img alt="Modern clean architectural abstract representing efficiency" className="w-full h-[500px] object-cover group-hover:scale-105 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLTE5_md2CM25RBp7mbk1KHGQmfhqR5LscZXYiP56oU8O50Vag49ZysJOAOjKC34LH5jXJIVZU6Z-r2zg9KeboQ10zAYA8UUh3LqdOxOP1Yn5KkI6GJWw22W8-91pIBxRfXq4rI66afFgrJX1FBo483bCvUAg00jnu8BPgOY22z2K3C1lzQ8FWLXHHo-xCs7b0_p4GhFMtPVqcgModQzn-KyxHLzUGzrEcE-UyNx3_5ZarYRiZJmmIVby4t3xYxig7AXwbXtjb0eQ" />
                <div className="absolute inset-0 bg-primary/10 mix-blend-multiply"></div>
              </div>
              <div className="order-1 lg:order-2 flex flex-col gap-6 pl-0 lg:pl-8">
                <h2 className="text-3xl font-bold text-text tracking-tight">Algorithmic Efficiency</h2>
                <p className="text-text-muted text-lg leading-relaxed">
                  RateGuard acts like an independent auditor within the complex financial ecosystems of corporate firms. Our goal is to provide a fully autonomous contract lifecycle by eliminating data loss and calculation errors caused by manual processes.
                </p>
                <ul className="flex flex-col gap-4 mt-4">
                  <li className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-border shadow-sm">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[24px] text-green-500">check_circle</span>
                    </div>
                    <span className="font-medium text-text text-lg">Zero calculation errors</span>
                  </li>
                  <li className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-border shadow-sm">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[24px] text-green-500">check_circle</span>
                    </div>
                    <span className="font-medium text-text text-lg">100% Legal compliance</span>
                  </li>
                  <li className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-border shadow-sm">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[24px] text-green-500">check_circle</span>
                    </div>
                    <span className="font-medium text-text text-lg">Real-time reporting infrastructure</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
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