import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'

const NAV_ITEMS = [
  { to: '/solutions', label: 'Solutions' },
  { to: '/about-us', label: 'About Us' },
  { to: '/key-benefits', label: 'Key Benefits' },
  { to: '/contact', label: 'Contact' },
]

export default function MarketingLayout({ children }) {
  const { dark, toggle } = useTheme()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-bg text-text font-display selection:bg-primary selection:text-white">
      <nav className="fixed top-0 z-50 w-full border-b border-border bg-surface/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 md:px-10">
          <div className="flex min-w-0 items-center gap-5 lg:gap-8">
            <Link to="/" className="flex shrink-0 items-center gap-2">
              <span className="material-symbols-outlined text-2xl text-primary">shield</span>
              <span className="text-xl font-extrabold tracking-tight sm:text-2xl">RateGuard</span>
            </Link>
            <div className="hidden items-center gap-5 md:flex">
              {NAV_ITEMS.map((item) => {
                const active = location.pathname === item.to
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`text-sm font-medium transition-colors ${
                      active ? 'text-primary' : 'text-text-muted hover:text-text'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              onClick={toggle}
              className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-hover hover:text-text"
              title={dark ? 'Light mode' : 'Dark mode'}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">
                {dark ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <Link
              to="/login"
              className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark sm:px-4 sm:text-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-16">{children}</main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-12 md:grid-cols-2 md:px-10 lg:grid-cols-4">
          <div className="flex flex-col gap-4 pr-8">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xl text-primary">shield</span>
              <span className="text-xl font-extrabold tracking-tight">RateGuard</span>
            </div>
            <p className="text-sm leading-relaxed text-text-muted">
              AI-assisted contract renewal, inflation adjustment, approval workflow, and team access management in one secure workspace.
            </p>
            <p className="text-xs text-text-muted/70">© 2026 RateGuard. All rights reserved.</p>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="mb-1 font-semibold text-text">Platform</h4>
            <Link to="/solutions" className="text-sm text-text-muted transition-colors hover:text-primary">Solutions</Link>
            <Link to="/key-benefits" className="text-sm text-text-muted transition-colors hover:text-primary">Key Benefits</Link>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="mb-1 font-semibold text-text">Company</h4>
            <Link to="/about-us" className="text-sm text-text-muted transition-colors hover:text-primary">About Us</Link>
            <Link to="/contact" className="text-sm text-text-muted transition-colors hover:text-primary">Contact</Link>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="mb-1 font-semibold text-text">Legal</h4>
            <Link to="/privacy-policy" className="text-sm text-text-muted transition-colors hover:text-primary">Privacy Policy</Link>
            <Link to="/terms-of-service" className="text-sm text-text-muted transition-colors hover:text-primary">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
