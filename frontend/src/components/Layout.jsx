import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../contexts/AuthContext";
import NotificationBell from "./NotificationBell";
import RateBot from "./RateBot/RateBot";
import { useRateBot } from "../contexts/RateBotContext";

const ALL_NAV_ITEMS = [
  { to: "/dashboard", icon: "dashboard", label: "Dashboard", roles: null },
  {
    to: "/renewal-review",
    icon: "description",
    label: "Contracts",
    roles: [
      "super_admin",
      "company_admin",
      "finance",
      "sales",
      "user",
    ],
  },
  {
    to: "/clients",
    icon: "group",
    label: "Clients",
    roles: ["super_admin", "company_admin"],
  },
  {
    to: "/applications",
    icon: "work",
    label: "Applications",
    roles: ["user"],
  },
  {
    to: "/application-management",
    icon: "assignment_ind",
    label: "Applications",
    roles: ["super_admin", "company_admin", "hr"],
  },
  {
    to: "/team",
    icon: "manage_accounts",
    label: "Team",
    roles: ["super_admin", "company_admin"],
  },
  {
    to: "/internal-chat",
    icon: "forum",
    label: "Chat",
    roles: ["super_admin", "company_admin", "finance", "sales", "hr"],
  },
  {
    to: "/audit-log",
    icon: "history",
    label: "Audit Log",
    roles: ["super_admin", "company_admin", "finance"],
  },
  {
    to: "/analytics",
    icon: "monitoring",
    label: "Analytics",
    roles: ["super_admin", "company_admin", "finance", "user"],
  },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { activeContractId } = useRateBot();

  const navItems = ALL_NAV_ITEMS.filter((item) => {
    if (item.to === "/renewal-review" && user?.role === "user" && !user?.company_id) {
      return false;
    }
    return !item.roles || (user && item.roles.includes(user.role));
  });

  const isActive = (path) =>
    path === "/renewal-review"
      ? location.pathname.startsWith("/renewal-review")
      : location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const ROLE_LABEL = {
    super_admin: "Super Admin",
    company_admin: "Company Admin",
    finance: "Finance",
    sales: "Sales",
    hr: "HR",
    user: "User",
  };

  return (
    <div className="flex h-screen w-full min-w-0 flex-col overflow-hidden bg-bg text-text">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-4 lg:gap-8">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-hover lg:hidden"
          >
            <span className="material-symbols-outlined text-[22px]">
              {mobileOpen ? "close" : "menu"}
            </span>
          </button>

          <Link to="/dashboard" className="flex min-w-0 shrink-0 items-center gap-2" translate="no">
            <span className="material-symbols-outlined notranslate text-primary filled text-xl" translate="no">
              security
            </span>
            <span className="rg-notranslate notranslate text-lg font-bold tracking-tight" translate="no">RateGuard</span>
          </Link>

          <nav className="hidden min-w-0 items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive(item.to)
                    ? "bg-primary-soft text-primary"
                    : "text-text-muted hover:bg-hover hover:text-text"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[18px] ${isActive(item.to) ? "filled" : ""}`}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <NotificationBell />
          <button
            onClick={toggle}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-hover hover:text-text"
            title={dark ? "Light mode" : "Dark mode"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {dark ? "light_mode" : "dark_mode"}
            </span>
          </button>
          <div className="hidden h-5 w-px bg-border sm:block" />
          <div className="hidden sm:flex items-center gap-2">
            <div className="text-right">
              <span className="block text-xs font-medium text-text">
                {user?.full_name || "User"}
              </span>
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
            <span className="material-symbols-outlined text-[20px]">
              logout
            </span>
          </button>
        </div>
      </header>

      {mobileOpen && (
        <nav className="flex flex-col border-b border-border bg-surface px-4 py-2 lg:hidden">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(item.to)
                  ? "bg-primary-soft text-primary"
                  : "text-text-muted hover:bg-hover hover:text-text"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[18px] ${isActive(item.to) ? "filled" : ""}`}
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
            <span className="material-symbols-outlined text-[18px]">
              logout
            </span>
            Logout
          </button>
        </nav>
      )}

      <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
      <RateBot contractId={activeContractId} />
    </div>
  );
}
