import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ROLE_HUB = {
  sales: {
    label: "Sales",
    icon: "handshake",
    focus: "Prepare the commercial draft and manage client communication.",
    primaryAction: "Create draft contracts and send approved renewals to clients.",
    nextStep: "Open Contracts, prepare the draft, then wait for Finance and Admin approval before sending.",
    quickActions: [
      { label: "Create draft", icon: "note_add", to: "/renewal-review" },
      { label: "Send to client", icon: "send", to: "/renewal-review" },
      { label: "Start new version", icon: "difference", to: "/renewal-review" },
    ],
    can: ["Create and edit drafts", "Prepare client emails", "Create new versions"],
    cannot: ["Approve finance math", "Skip admin approval", "Edit final records"],
    checks: ["Client is correct", "Amount is ready", "Email is client-safe"],
  },
  finance: {
    label: "Finance",
    icon: "calculate",
    focus: "Validate renewal math, source assumptions, caps, and financial impact.",
    primaryAction: "Approve the calculation when the renewal amount is defensible.",
    nextStep: "Review contracts in Finance Review, save draft changes if needed, then approve the calculation.",
    quickActions: [
      { label: "Review calculation", icon: "calculate", to: "/renewal-review" },
      { label: "Notify Sales", icon: "forward_to_inbox", to: "/renewal-review" },
      { label: "Check impact", icon: "monitoring", to: "/analytics" },
    ],
    can: ["Check amount and cap", "Save calculation drafts", "Approve finance review"],
    cannot: ["Send to client", "Final-approve admin stage", "Manage team access"],
    checks: ["Source is clear", "Cap is applied", "New amount matches the rule"],
  },
  hr: {
    label: "HR",
    icon: "badge",
    focus: "Review department applications and keep role assignments clean.",
    primaryAction: "Approve or reject applications with a clear applicant message.",
    nextStep: "Open Applications, review the applicant, add a message, then approve or reject.",
    quickActions: [
      { label: "Review applications", icon: "assignment_ind", to: "/application-management" },
      { label: "Open chat", icon: "forum", to: "/internal-chat" },
      { label: "Check team roles", icon: "groups", to: "/team" },
    ],
    can: ["Review applications", "Approve department roles", "Send decision messages"],
    cannot: ["Work contracts", "Manage clients", "Approve outside company"],
    checks: ["Correct company", "Correct department", "Message is professional"],
  },
  company_admin: {
    label: "Company Admin",
    icon: "admin_panel_settings",
    focus: "Own company setup, team access, client relationships, and final internal approval.",
    primaryAction: "Approve finance-ready contracts before Sales sends them to the client.",
    nextStep: "Review the finance-approved contract, confirm the business decision, then approve client sending.",
    quickActions: [
      { label: "Approve sending", icon: "verified", to: "/renewal-review" },
      { label: "Manage team", icon: "manage_accounts", to: "/team" },
      { label: "Review audit", icon: "history", to: "/audit-log" },
    ],
    can: ["Manage team roles", "Manage clients", "Approve client sending"],
    cannot: ["Rewrite final history", "Ignore finance review", "Act outside company scope"],
    checks: ["Finance approved", "Client message is acceptable", "Team ownership is correct"],
  },
};

const ROLE_ORDER = ["sales", "finance", "hr", "company_admin"];

const FLOW = [
  { label: "Draft", owner: "Sales", icon: "edit_note" },
  { label: "Finance Review", owner: "Finance", icon: "calculate" },
  { label: "Finance Approved", owner: "Finance", icon: "task_alt" },
  { label: "Admin Approval", owner: "Company Admin", icon: "verified" },
  { label: "Sent To Client", owner: "Sales", icon: "send" },
  { label: "Client Decision", owner: "Client", icon: "gavel" },
];

function PillList({ title, icon, items, tone = "primary" }) {
  const toneClass = tone === "red" ? "text-red-500 bg-red-500/10" : "text-primary bg-primary-soft";
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className={`material-symbols-outlined rounded-md p-1 text-[18px] ${toneClass}`}>{icon}</span>
        <h3 className="text-sm font-extrabold">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-full border border-border bg-surface-alt px-3 py-1.5 text-xs font-bold text-text-muted">
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

export default function RoleGuidePage() {
  const { user } = useAuth();
  const currentRole = user?.role;
  const initialRole = ROLE_HUB[currentRole] ? currentRole : "sales";
  const [activeRole, setActiveRole] = useState(initialRole);
  const role = ROLE_HUB[activeRole];
  const roleOptions = ROLE_HUB[currentRole]
    ? [currentRole, ...ROLE_ORDER.filter((item) => item !== currentRole)]
    : ROLE_ORDER;

  return (
    <div className="h-full overflow-y-auto bg-bg text-text">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-8 sm:py-7">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-text-muted">
              <span className="material-symbols-outlined text-[17px]">conversion_path</span>
              Workflow
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Role Hub</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
              Quick role ownership, next action, and contract handoff map.
            </p>
          </div>

          <div className="flex max-w-full gap-2 overflow-x-auto">
            {roleOptions.map((key) => {
              const item = ROLE_HUB[key];
              const selected = activeRole === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveRole(key)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                    selected
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-surface text-text-muted hover:bg-hover hover:text-text"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <div className="rounded-lg border border-border bg-surface p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <span className="material-symbols-outlined text-[25px]">{role.icon}</span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-extrabold">{role.label}</h3>
                  {currentRole === activeRole && (
                    <span className="rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary">
                      Your role
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-6 text-text-muted">{role.focus}</p>
              </div>
            </div>
            <div className="mt-5 rounded-lg border border-border bg-surface-alt p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Main job</p>
              <p className="mt-2 text-sm font-bold leading-6">{role.primaryAction}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[19px] text-primary">near_me</span>
              <h3 className="text-sm font-extrabold">Next Step</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-text-muted">{role.nextStep}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {role.quickActions.map((action) => (
                <Link
                  key={action.label}
                  to={action.to}
                  className="flex min-h-24 flex-col justify-between rounded-lg border border-border bg-surface-alt p-3 transition-colors hover:border-primary/40 hover:bg-hover"
                >
                  <span className="material-symbols-outlined text-[21px] text-primary">{action.icon}</span>
                  <span className="mt-3 text-sm font-extrabold">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[19px] text-primary">account_tree</span>
            <h3 className="text-sm font-extrabold">Contract Flow</h3>
          </div>
          <div className="grid gap-2 md:grid-cols-6">
            {FLOW.map((step, index) => {
              const active = step.owner === role.label || (activeRole === "company_admin" && step.owner === "Company Admin");
              return (
                <div
                  key={step.label}
                  className={`rounded-lg border p-3 ${
                    active
                      ? "border-primary/40 bg-primary-soft"
                      : "border-border bg-surface-alt"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`material-symbols-outlined text-[20px] ${active ? "text-primary" : "text-text-muted"}`}>
                      {step.icon}
                    </span>
                    <span className="text-[11px] font-extrabold text-text-muted">{index + 1}</span>
                  </div>
                  <p className="mt-3 text-sm font-extrabold">{step.label}</p>
                  <p className="mt-1 text-xs font-semibold text-text-muted">{step.owner}</p>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <PillList title="Can Do" icon="task_alt" items={role.can} />
          <PillList title="Cannot Do" icon="block" items={role.cannot} tone="red" />
          <PillList title="Check Before Moving" icon="rule" items={role.checks} />
        </div>
      </div>
    </div>
  );
}
