import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from './NotificationBell'

const ALL_NAV_ITEMS = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard', roles: null },
  { to: '/renewal-review', icon: 'description', label: 'Contracts', roles: ['super_admin', 'company_admin', 'finance', 'sales'] },
  { to: '/clients', icon: 'group', label: 'Clients', roles: ['super_admin', 'company_admin', 'sales'] },
  { to: '/analytics', icon: 'monitoring', label: 'Analytics', roles: ['super_admin', 'company_admin', 'finance'] },
  { to: '/team', icon: 'manage_accounts', label: 'Team', roles: ['super_admin', 'company_admin'] },
  { to: '/audit-log', icon: 'history', label: 'Audit Log', roles: ['super_admin', 'company_admin', 'finance'] },
]

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { dark, toggle } = useTheme()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = ALL_NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  )

  const isActive = (path) =>
    path === '/renewal-review'
      ? location.pathname.startsWith('/renewal-review')
      : location.pathname === path

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const ROLE_LABEL = {
    super_admin: 'Super Admin',
    company_admin: 'Company Admin',
    finance: 'Finance',
    sales: 'Sales',
    client: 'Client',
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-bg text-text">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
        <div className="flex items-center gap-4 sm:gap-8">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-hover sm:hidden"
          >
            <span className="material-symbols-outlined text-[22px]">
              {mobileOpen ? 'close' : 'menu'}
            </span>
          </button>

          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary filled text-xl">shield</span>
            <span className="text-lg font-bold tracking-tight">Enflasyon Kalkanı</span>
          </Link>

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
                <span
                  className={`material-symbols-outlined text-[18px] ${isActive(item.to) ? 'filled' : ''}`}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
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
          <div className="hidden sm:flex items-center gap-2">
            <div className="text-right">
              <span className="block text-xs font-medium text-text">{user?.full_name || 'User'}</span>
              <span className="block text-[10px] text-text-muted">
                {ROLE_LABEL[user?.role] || user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-hover hover:text-red-500"
            title="Logout"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </header>

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
              <span
                className={`material-symbols-outlined text-[18px] ${isActive(item.to) ? 'filled' : ''}`}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-hover"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Logout
          </button>
        </nav>
      )}

      <main className="flex h-full flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  )
}
