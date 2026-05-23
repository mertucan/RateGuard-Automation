import { useEffect, useMemo, useState } from "react";
import { getProfile, updateProfile, updateProfilePassword } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { PageLoader } from "../components/Spinner";
import { formatDisplayDate } from "../utils/dateFormat";

const ROLE_LABELS = {
  super_admin: "Super Admin",
  company_admin: "Company Admin",
  finance: "Finance",
  sales: "Sales",
  hr: "HR",
  user: "User",
};

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary";

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  visible,
  onChange,
  onToggle,
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-text-muted">
        {label}
      </span>
      <span className="relative block">
        <input
          className={`${inputClass} pr-10`}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          onClick={() => onToggle(id)}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-hover hover:text-text"
          title={visible ? "Hide password" : "Show password"}
        >
          <span className="material-symbols-outlined text-[18px]">
            {visible ? "visibility_off" : "visibility"}
          </span>
        </button>
      </span>
    </label>
  );
}

export default function ProfileSettingsPage() {
  const { user, updateCurrentUser } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [form, setForm] = useState({ full_name: "" });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [visiblePasswords, setVisiblePasswords] = useState({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getProfile()
      .then((data) => {
        if (!mounted) return;
        setProfile(data);
        setForm({
          full_name: data?.full_name || "",
        });
        updateCurrentUser(data);
      })
      .catch((err) => {
        toastError(err.message || "Profile could not be loaded.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [toastError, updateCurrentUser]);

  const initials = useMemo(() => {
    const name = form.full_name || user?.full_name || "User";
    return name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [form.full_name, user?.full_name]);

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    if (!form.full_name.trim()) {
      toastError("Name is required.");
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await updateProfile({
        full_name: form.full_name.trim(),
      });
      setProfile(updated);
      setForm({
        full_name: updated?.full_name || "",
      });
      updateCurrentUser(updated);
      toastSuccess("Profile updated.");
    } catch (err) {
      toastError(err.message || "Profile could not be updated.");
    } finally {
      setSavingProfile(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setVisiblePasswords((current) => ({
      ...current,
      [field]: !current[field],
    }));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (passwordForm.new_password.length < 8) {
      toastError("New password must be at least 8 characters.");
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toastError("New passwords do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      await updateProfilePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      toastSuccess("Password updated.");
    } catch (err) {
      toastError(err.message || "Password could not be updated.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="h-full overflow-y-auto bg-bg text-text">
      <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5 sm:px-8 sm:py-7">
        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Profile Settings
            </h2>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-sm font-bold text-primary">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{profile?.full_name || "User"}</p>
              <p className="truncate text-xs text-text-muted">{profile?.email || "-"}</p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Role</p>
            <p className="mt-2 text-sm font-semibold">{ROLE_LABELS[profile?.role] || profile?.role || "-"}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Company</p>
            <p className="mt-2 truncate text-sm font-semibold">
              {profile?.companies?.company_name || "Not assigned"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Joined</p>
            <p className="mt-2 text-sm font-semibold">
              {formatDisplayDate(profile?.created_at, "-")}
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <form
            onSubmit={handleProfileSubmit}
            className="rounded-lg border border-border bg-surface p-4 sm:p-5"
          >
            <div className="mb-4">
              <h3 className="text-base font-bold">Account Information</h3>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-text-muted">
                  Full name
                </span>
                <input
                  className={inputClass}
                  value={form.full_name}
                  onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                />
              </label>
              <div>
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-text-muted">
                  Email
                </span>
                <div className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm font-semibold text-text-muted">
                  {profile?.email || "-"}
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-center">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex h-10 min-w-36 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                {savingProfile ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>

          <form
            onSubmit={handlePasswordSubmit}
            className="rounded-lg border border-border bg-surface p-4 sm:p-5"
          >
            <div className="mb-4">
              <h3 className="text-base font-bold">Password</h3>
            </div>
            <div className="space-y-4">
              <PasswordField
                id="current_password"
                label="Current password"
                autoComplete="current-password"
                value={passwordForm.current_password}
                visible={!!visiblePasswords.current_password}
                onToggle={togglePasswordVisibility}
                onChange={(event) =>
                  setPasswordForm({ ...passwordForm, current_password: event.target.value })
                }
              />
              <PasswordField
                id="new_password"
                label="New password"
                autoComplete="new-password"
                value={passwordForm.new_password}
                visible={!!visiblePasswords.new_password}
                onToggle={togglePasswordVisibility}
                onChange={(event) =>
                  setPasswordForm({ ...passwordForm, new_password: event.target.value })
                }
              />
              <PasswordField
                id="confirm_password"
                label="Confirm new password"
                autoComplete="new-password"
                value={passwordForm.confirm_password}
                visible={!!visiblePasswords.confirm_password}
                onToggle={togglePasswordVisibility}
                onChange={(event) =>
                  setPasswordForm({ ...passwordForm, confirm_password: event.target.value })
                }
              />
            </div>
            <div className="mt-5 flex justify-center">
              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex h-10 min-w-40 items-center justify-center gap-2 rounded-lg border border-border bg-surface-alt px-4 text-sm font-semibold text-text transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary disabled:cursor-wait disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                {savingPassword ? "Updating..." : "Update password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
