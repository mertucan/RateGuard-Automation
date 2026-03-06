import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'

const navItems = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/renewal-review', icon: 'description', label: 'Contracts' },
  { to: '/clients', icon: 'group', label: 'Clients' },
  { to: '/analytics', icon: 'monitoring', label: 'Analytics' },
]

export default function Layout({ children }) {
  const location = useLocation()
  const { dark, toggle } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (path) =>
    path === '/renewal-review'
      ? location.pathname.startsWith('/renewal-review')
      : location.pathname === path

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-bg text-text">
      {/* Top Navbar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
        <div className="flex items-center gap-4 sm:gap-8">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-hover sm:hidden"
          >
            <span className="material-symbols-outlined text-[22px]">{mobileOpen ? 'close' : 'menu'}</span>
          </button>

          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary filled text-xl">shield</span>
            <span className="text-lg font-bold tracking-tight">RateGuard</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive(item.to)
                    ? 'bg-primary-soft text-primary'
                    : 'text-text-muted hover:bg-hover hover:text-text'
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] ${isActive(item.to) ? 'filled' : ''}`}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-hover hover:text-text"
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            <span className="material-symbols-outlined text-[20px]">
              {dark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <div className="hidden h-5 w-px bg-border sm:block" />
          <span className="hidden text-xs text-text-muted sm:inline">admin@rateguard.io</span>
        </div>
      </header>

      {/* Mobile nav dropdown */}
      {mobileOpen && (
        <nav className="flex flex-col border-b border-border bg-surface px-4 py-2 sm:hidden">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(item.to)
                  ? 'bg-primary-soft text-primary'
                  : 'text-text-muted hover:bg-hover hover:text-text'
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${isActive(item.to) ? 'filled' : ''}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      {/* Page Content */}
      <main className="flex h-full flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
