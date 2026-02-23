import { Link, useLocation } from 'react-router-dom';

export default function Layout({ children }) {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light text-text-primary">
      <aside className="flex h-full w-64 shrink-0 flex-col justify-between border-r border-border-light bg-surface-light p-4">
        <div>
          <div className="mb-6 px-2">
            <h1 className="text-xl font-bold">RateGuard</h1>
            <p className="text-xs text-text-secondary">Admin Console</p>
          </div>
          <nav className="space-y-1">
            <Link
              to="/dashboard"
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive('/dashboard')
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-slate-50 hover:text-text-primary'
              }`}
            >
              <span className={`material-symbols-outlined ${isActive('/dashboard') ? 'filled' : ''}`}>dashboard</span>
              Dashboard
            </Link>
            <Link
              to="/renewal-review"
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive('/renewal-review')
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-slate-50 hover:text-text-primary'
              }`}
            >
              <span className={`material-symbols-outlined ${isActive('/renewal-review') ? 'filled' : ''}`}>description</span>
              Contracts
            </Link>
            <Link
              to="/clients"
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive('/clients')
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-slate-50 hover:text-text-primary'
              }`}
            >
              <span className={`material-symbols-outlined ${isActive('/clients') ? 'filled' : ''}`}>group</span>
              Clients
            </Link>
          </nav>
        </div>
        <div className="border-t border-border-light px-3 pt-4 text-xs text-text-secondary">
          admin@rateguard.io
        </div>
      </aside>
      <main className="flex h-full flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
