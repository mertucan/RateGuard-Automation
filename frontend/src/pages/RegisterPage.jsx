import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../contexts/ToastContext";
import { registerUser } from "../api";

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Very Weak", color: "bg-red-500" };
  if (score === 2) return { score, label: "Weak", color: "bg-orange-500" };
  if (score === 3) return { score, label: "Fair", color: "bg-yellow-500" };
  if (score === 4) return { score, label: "Strong", color: "bg-emerald-500" };
  return { score, label: "Very Strong", color: "bg-emerald-600" };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess } = useToast();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "company_admin",
    company_name: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onChange = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const passwordStrength = useMemo(
    () => getPasswordStrength(form.password),
    [form.password],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toastError("Passwords do not match. Please re-enter your password.");
      return;
    }
    if (form.password.length < 8) {
      toastError("Password must be at least 8 characters long.");
      return;
    }
    if (passwordStrength.score < 2) {
      toastError(
        "Password is too weak. Add uppercase letters, numbers, or symbols.",
      );
      return;
    }
    if (form.role === "company_admin" && !form.company_name.trim()) {
      toastError(
        "Company name is required for Company Administrator accounts.",
      );
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: form.role,
        company_name:
          form.role === "company_admin" ? form.company_name : undefined,
      });
      toastSuccess("Account created successfully! You can now sign in.", 6000);
      navigate("/login");
    } catch (err) {
      toastError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg py-3 pl-11 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 transition-all";

  return (
    <div className="bg-mesh font-body text-on-surface min-h-screen flex flex-col items-center justify-center selection:bg-primary selection:text-on-primary antialiased px-4 relative overflow-hidden">
      <div className="geometric-overlay" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/10 to-transparent" />

      <header className="relative z-10 mb-8 text-center mt-8">
        <div className="flex flex-col items-center gap-2">
          <Link to="/" className="rg-notranslate notranslate text-3xl font-bold tracking-tighter text-primary font-headline flex items-center gap-3" translate="no">
            <span
              className="material-symbols-outlined notranslate text-4xl"
              translate="no"
              data-icon="security"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              security
            </span>
            <span translate="no">RateGuard</span>
          </Link>
          <div className="mt-2 text-[10px] uppercase tracking-[0.3em] text-on-surface-variant font-semibold opacity-70">
            Renewal Intelligence Platform
          </div>
        </div>
      </header>

      <main className="relative z-10 grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-low shadow-2xl shadow-primary/10 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden border-r border-outline-variant/20 bg-surface-container-highest/60 p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              Create workspace access
            </span>
            <h1 className="headline-font mt-6 text-3xl font-extrabold tracking-tight text-on-surface">
              Start with a company admin account or request user access.
            </h1>
            <p className="mt-4 text-sm leading-7 text-on-surface-variant">
              Company administrators can create a tenant company. Users can register and later apply to Sales, Finance, or HR teams.
            </p>
          </div>
          <div className="space-y-3">
            {[
              ['Company admin', 'Create and manage a company workspace.'],
              ['User', 'Apply to join company departments after sign in.'],
              ['Finance', 'Validate renewal calculations and market-based adjustments.'],
              ['Sales', 'Prepare client communication and manage renewal follow-up.'],
              ['HR', 'Review department applications and team access requests.'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-4">
                <p className="text-sm font-bold text-on-surface">{title}</p>
                <p className="mt-1 text-xs leading-5 text-on-surface-variant">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="relative p-6 sm:p-10">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-[70px]" />
          <div className="relative z-10 mx-auto max-w-[440px]">
            <div className="mb-8 text-center">
              <h2 className="font-headline text-2xl font-bold text-on-surface">
                Create Account
              </h2>
              <p className="text-sm text-on-surface-variant mt-2">
                Set up your RateGuard account.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider opacity-90">
                Account Type
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                  badge
                </span>
                <select
                  className={`${inputCls} rg-select`}
                  value={form.role}
                  onChange={onChange("role")}
                >
                  <option value="company_admin">Company Administrator</option>
                  <option value="user">User</option>
                </select>
              </div>
            </div>

            {form.role === "company_admin" && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider opacity-90">
                  Company Name
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                    business
                  </span>
                  <input
                    className={inputCls}
                    placeholder="Acme Corporation"
                    type="text"
                    value={form.company_name}
                    onChange={onChange("company_name")}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                  person
                </span>
                <input
                  className={inputCls}
                  placeholder="Alexander Thorne"
                  type="text"
                  value={form.full_name}
                  onChange={onChange("full_name")}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                  alternate_email
                </span>
                <input
                  className={inputCls}
                  placeholder="a.thorne@sovereign.int"
                  type="email"
                  value={form.email}
                  onChange={onChange("email")}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                Password
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                  vpn_key
                </span>
                <input
                  className={inputCls}
                  placeholder="Minimum 8 characters"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={onChange("password")}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              {form.password && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          i <= passwordStrength.score
                            ? passwordStrength.color
                            : "bg-outline-variant/20"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-xs font-medium ${
                        passwordStrength.score <= 1
                          ? "text-red-500"
                          : passwordStrength.score === 2
                            ? "text-orange-500"
                            : passwordStrength.score === 3
                              ? "text-yellow-500"
                              : "text-emerald-500"
                      }`}
                    >
                      {passwordStrength.label}
                    </p>
                    <p className="text-[10px] text-on-surface opacity-50">
                      Use uppercase, numbers & symbols to strengthen
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                  vpn_key
                </span>
                <input
                  className={inputCls}
                  placeholder="••••••••••"
                  type={showPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={onChange("confirmPassword")}
                  required
                />
              </div>
            </div>

            <button
              className="w-full group mt-4 relative overflow-hidden bg-linear-to-br from-primary to-[#357df1] text-on-primary font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/10 disabled:opacity-60 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
            </form>

            <div className="mt-10 pt-6 border-t border-outline-variant/10 text-center">
              <p className="text-xs text-on-surface-variant">
                Already have an account?
                <Link
                  to="/login"
                  className="text-primary font-semibold hover:underline decoration-primary/30 underline-offset-4 transition-all ml-1"
                >
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto pt-16 pb-8 w-full flex flex-col md:flex-row justify-between items-center px-12 text-on-surface-variant font-['Inter'] text-[10px] uppercase tracking-[0.2em] opacity-50 hover:opacity-80 transition-opacity duration-500">
        <div className="mb-6 md:mb-0">
          &copy; 2026 RateGuard Intelligence
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          <Link className="hover:text-primary transition-colors" to="/privacy-policy">Privacy</Link>
          <Link className="hover:text-primary transition-colors" to="/terms-of-service">Terms</Link>
          <Link className="hover:text-primary transition-colors" to="/contact">Contact</Link>
        </div>
      </footer>
    </div>
  );
}
