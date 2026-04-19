import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageLoader } from "../components/Spinner";
import ChatPanel from "../components/ChatPanel";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import {
  getContracts,
  getContract,
  createContract,
  deleteContract,
  getCompanies,
  getCalculation,
  getMarketData,
  downloadPdf,
  saveDraft,
  rejectContract,
  approveContract,
  generateEmailDraft,
  analyzeContractTone,
  sendContractToClient,
  clientApproveContract,
  clientRejectContract,
} from "../api";

const STATUS_MAP = {
  all: { label: "All", icon: "list" },
  active: { label: "Active", icon: "check_circle", cls: "text-emerald-500" },
  draft: { label: "Draft", icon: "edit_note", cls: "text-amber-500" },
  approved: { label: "Approved", icon: "verified", cls: "text-primary" },
  pending_client: {
    label: "Awaiting Client",
    icon: "pending",
    cls: "text-violet-500",
  },
  client_approved: {
    label: "Client Approved",
    icon: "task_alt",
    cls: "text-emerald-600",
  },
  client_rejected: {
    label: "Client Rejected",
    icon: "cancel",
    cls: "text-red-600",
  },
  rejected: { label: "Rejected", icon: "block", cls: "text-red-500" },
};

const RULE_OPTIONS = ["All", "TUFE", "UFE", "TUFE+UFE"];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
  return Math.ceil(diff);
}

function statusBadge(status) {
  const map = {
    active: "bg-emerald-500/10 text-emerald-500",
    draft: "bg-amber-500/10 text-amber-500",
    approved: "bg-sky-500/10 text-sky-500",
    pending_client: "bg-violet-500/10 text-violet-500",
    client_approved: "bg-emerald-600/10 text-emerald-600",
    client_rejected: "bg-red-600/10 text-red-600",
    rejected: "bg-red-500/10 text-red-500",
  };
  return map[status] || map.active;
}

function urgencyBadge(days) {
  if (days === null) return null;
  if (days < 0) return { text: "Expired", cls: "bg-red-500/10 text-red-500" };
  if (days <= 30)
    return { text: `${days}d left`, cls: "bg-red-500/10 text-red-500" };
  if (days <= 60)
    return { text: `${days}d left`, cls: "bg-amber-500/10 text-amber-500" };
  return { text: `${days}d left`, cls: "bg-emerald-500/10 text-emerald-500" };
}

/* ─── GENERIC CONFIRM / DELETE MODAL ─── */
function ConfirmModal({
  open,
  title,
  message,
  details,
  confirmText,
  confirmCls,
  onConfirm,
  onCancel,
  loading,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${confirmCls || "bg-primary/10"}`}
          >
            <span className="material-symbols-outlined text-xl text-primary">
              info
            </span>
          </div>
          <div>
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="text-sm text-text-muted">{message}</p>
          </div>
        </div>
        {details && (
          <div className="mb-4 rounded-lg border border-border bg-surface-alt p-4 text-sm">
            {details}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-hover"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {loading ? "Processing..." : confirmText || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── CONTRACT LIST ─── */
function ContractList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [contracts, setContracts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [ruleFilter, setRuleFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [marketRates, setMarketRates] = useState({ tufe: null, ufe: null });
  const [form, setForm] = useState({
    company_id: "",
    previous_amount: "",
    currency: "TRY",
    contract_type: "service_contract",
    end_date: "",
    inflation_base_rule: "TUFE",
    max_increase_limit: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const contractParams =
        user?.role === "company_admin" && user?.company_id
          ? { tenant_company_id: user.company_id }
          : user?.role === "client" && user?.company_id
            ? { company_id: user.company_id }
            : {};
      const [c, co, md] = await Promise.all([
        getContracts(contractParams),
        getCompanies(),
        getMarketData().catch(() => null),
      ]);
      setContracts(c);
      setCompanies(
        user?.role === "company_admin" ? co.filter((c) => !c.is_tenant) : co,
      );
      if (md) {
        setMarketRates({
          tufe: md.tufe ?? md.tufe_yoy,
          ufe: md.ufe ?? md.ufe_yoy,
        });
        // Seed the initial value for TUFE since it is the default selected rule
        if (md.tufe != null || md.tufe_yoy != null) {
          setForm(prev => ({
             ...prev, 
             max_increase_limit: prev.max_increase_limit || String(parseFloat(md.tufe ?? md.tufe_yoy).toFixed(1))
          }))
        }
      }
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRuleChange = (rule) => {
    let suggested = "";
    if (rule === "TUFE" && marketRates.tufe != null) {
      suggested = String(parseFloat(marketRates.tufe).toFixed(1));
    } else if (rule === "UFE" && marketRates.ufe != null) {
      suggested = String(parseFloat(marketRates.ufe).toFixed(1));
    } else if (
      rule === "TUFE+UFE" &&
      marketRates.tufe != null &&
      marketRates.ufe != null
    ) {
      suggested = String(
        (
          (parseFloat(marketRates.tufe) + parseFloat(marketRates.ufe)) /
          2
        ).toFixed(1),
      );
    }
    setForm((prev) => ({
      ...prev,
      inflation_base_rule: rule,
      max_increase_limit: suggested,
    }));
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createContract({
        ...form,
        previous_amount: Number(form.previous_amount),
        currency: form.currency,
        max_increase_limit: form.max_increase_limit
          ? Number(form.max_increase_limit)
          : null,
        tenant_company_id: user?.company_id || null,
      });
      setShowForm(false);
      setForm({
        company_id: "",
        previous_amount: "",
        currency: "TRY",
        contract_type: "service_contract",
        end_date: "",
        inflation_base_rule: "TUFE",
        max_increase_limit: "",
      });
      // Reseed the limit on reset
      if (marketRates.tufe != null) {
        setForm(prev => ({...prev, max_increase_limit: String(parseFloat(marketRates.tufe).toFixed(1))}));
      }
      toastSuccess("Contract created successfully.");
      await load();
    } catch (err) {
      toastError("Failed to create contract: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteContract(deleteTarget);
      setDeleteTarget(null);
      toastSuccess("Contract deleted.");
      await load();
    } catch (err) {
      toastError("Failed to delete contract: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toastError("No data to export.");
      return;
    }
    const headers = [
      "ID",
      "Company Name",
      "Previous Amount",
      "Currency",
      "Rule",
      "End Date",
      "Status",
    ];
    const rows = filtered.map((c) => [
      c.id,
      c.companies?.company_name || "",
      c.previous_amount || 0,
      c.currency || "TRY",
      c.inflation_base_rule || "",
      c.end_date || "",
      c.status || "active",
    ]);

    const csvContent =
      [headers, ...rows]
        .map((e) => e.map((val) => `"${val}"`).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Contracts_Export_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (n, curr = "TRY") =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: curr || "TRY",
    }).format(n || 0);

  const filtered = useMemo(() => {
    let list = contracts;
    if (statusFilter !== "all") {
      list = list.filter((c) => (c.status || "active") === statusFilter);
    }
    if (ruleFilter !== "All") {
      list = list.filter((c) => c.inflation_base_rule === ruleFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        (c.companies?.company_name || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [contracts, statusFilter, ruleFilter, search]);

  const statusCounts = useMemo(() => {
    const counts = {
      all: contracts.length,
      active: 0,
      draft: 0,
      approved: 0,
      pending_client: 0,
      client_approved: 0,
      client_rejected: 0,
      rejected: 0,
    };
    contracts.forEach((c) => {
      const s = c.status || "active";
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [contracts]);

  if (loading) return <PageLoader />;

  const inputCls =
    "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-text">
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Contract"
        message="This action cannot be undone."
        confirmText="Delete"
        confirmCls="bg-red-500/10"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <header className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-4 sm:px-8 sm:py-5">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold sm:text-2xl">
            Renewal Review
          </h2>
          <p className="mt-1 hidden text-sm text-text-muted sm:block">
            Review and approve contract renewals.
          </p>
        </div>
        {user?.role !== "client" && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold transition-colors hover:bg-hover sm:px-4 sm:text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-dark sm:px-4 sm:text-sm"
            >
              {showForm ? "Cancel" : "New Contract"}
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* New Contract Form */}
          {showForm && (
            <div className="rounded-xl border border-primary/20 bg-primary-soft p-4 sm:p-6">
              <h3 className="mb-4 text-lg font-bold">Create New Contract</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
                    Company
                  </label>
                  <select
                    className={inputCls}
                    value={form.company_id}
                    onChange={(e) =>
                      setForm({ ...form, company_id: e.target.value })
                    }
                  >
                    <option value="">Select company...</option>
                    {companies.map((co) => (
                      <option key={co.id} value={co.id}>
                        {co.company_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
                    Amount
                  </label>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
                      type="number"
                      value={form.previous_amount}
                      onChange={(e) =>
                        setForm({ ...form, previous_amount: e.target.value })
                      }
                    />
                    <select
                      className="w-24 shrink-0 rounded-lg border border-border bg-surface px-2 py-2 text-sm text-text outline-none focus:border-primary"
                      value={form.currency}
                      onChange={(e) =>
                        setForm({ ...form, currency: e.target.value })
                      }
                    >
                      <option value="TRY">TRY</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
                    Contract Type
                  </label>
                  <select
                    className={inputCls}
                    value={form.contract_type}
                    onChange={(e) =>
                      setForm({ ...form, contract_type: e.target.value })
                    }
                  >
                    <option value="service_contract">Service Contract</option>
                    <option value="lease_agreement">Lease Agreement</option>
                    <option value="maintenance_agreement">Maintenance Agreement</option>
                    <option value="supply_agreement">Supply Agreement</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
                    End Date
                  </label>
                  <input
                    className={inputCls}
                    type="date"
                    value={form.end_date}
                    onChange={(e) =>
                      setForm({ ...form, end_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
                    Inflation Rule
                  </label>
                  <select
                    className={inputCls}
                    value={form.inflation_base_rule}
                    onChange={(e) => handleRuleChange(e.target.value)}
                  >
                    <option value="TUFE">
                      TUFE{" "}
                      {marketRates.tufe != null
                        ? `(${parseFloat(marketRates.tufe).toFixed(1)}%)`
                        : ""}
                    </option>
                    <option value="UFE">
                      UFE{" "}
                      {marketRates.ufe != null
                        ? `(${parseFloat(marketRates.ufe).toFixed(1)}%)`
                        : ""}
                    </option>
                    <option value="TUFE+UFE">
                      TUFE + UFE — Average{" "}
                      {marketRates.tufe != null && marketRates.ufe != null
                        ? `(${((parseFloat(marketRates.tufe) + parseFloat(marketRates.ufe)) / 2).toFixed(1)}%)`
                        : ""}
                    </option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 flex items-center justify-between text-xs font-semibold uppercase text-text-muted">
                    <span>Max Increase (%)</span>
                    {form.max_increase_limit && (
                      <span className="normal-case text-primary font-normal">
                        Auto-filled from {form.inflation_base_rule}
                      </span>
                    )}
                  </label>
                  <input
                    className={inputCls}
                    type="number"
                    step="0.1"
                    min="0"
                    max="200"
                    value={form.max_increase_limit}
                    placeholder="e.g. 36.7"
                    onChange={(e) =>
                      setForm({ ...form, max_increase_limit: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleCreate}
                    disabled={
                      saving || !form.company_id || !form.previous_amount
                    }
                    className="w-full rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                  >
                    {saving ? "Creating..." : "Create Contract"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface p-1">
              {Object.entries(STATUS_MAP).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors sm:px-3 ${
                    statusFilter === key
                      ? "bg-primary text-white"
                      : "text-text-muted hover:bg-hover hover:text-text"
                  }`}
                >
                  {val.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      statusFilter === key ? "bg-white/20" : "bg-surface-alt"
                    }`}
                  >
                    {statusCounts[key] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            {/* Rule Filter */}
            <select
              value={ruleFilter}
              onChange={(e) => setRuleFilter(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text outline-none focus:border-primary"
            >
              {RULE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r === "All" ? "All Rules" : r}
                </option>
              ))}
            </select>

            {/* Search */}
            <div className="w-full sm:flex-1">
              <input
                type="text"
                placeholder="Search company name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text outline-none placeholder:text-text-muted focus:border-primary sm:max-w-xs"
              />
            </div>

            <span className="text-xs text-text-muted">
              {filtered.length} contract{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Contract Table */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-12 text-center">
              <span className="material-symbols-outlined mb-2 text-4xl text-text-muted">
                description
              </span>
              <p className="text-sm text-text-muted">
                No contracts match your filters.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-surface-alt text-xs font-semibold uppercase tracking-wider text-text-muted">
                      <th className="px-4 py-3 sm:px-6 sm:py-4">Company</th>
                      <th className="px-4 py-3 sm:px-6 sm:py-4">Amount</th>
                      <th className="px-4 py-3 sm:px-6 sm:py-4">Rule & Limit</th>
                      <th className="hidden px-4 py-3 sm:table-cell sm:px-6 sm:py-4">End Date</th>
                      <th className="px-4 py-3 sm:px-6 sm:py-4">Status</th>
                      <th className="px-4 py-3 text-right sm:px-6 sm:py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((c) => {
                      const days = daysUntil(c.end_date);
                      const urgency = urgencyBadge(days);
                      const st = c.status || "active";

                      return (
                        <tr className="group transition-colors hover:bg-hover" key={c.id}>
                          <td className="px-4 py-3 sm:px-6 sm:py-4">
                            <div className="flex items-center gap-3">
                              <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary sm:flex">
                                {(c.companies?.company_name || "?")[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">
                                  {c.companies?.company_name || "—"}
                                </p>
                                <p className="text-xs text-text-muted">
                                  ID: {c.id.slice(0, 8)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium sm:px-6 sm:py-4">
                            {formatCurrency(c.previous_amount, c.currency)}
                          </td>
                          <td className="px-4 py-3 text-sm sm:px-6 sm:py-4">
                            <span className="font-medium">{c.inflation_base_rule || "—"}</span>
                            {c.max_increase_limit && (
                              <span className="ml-1 text-xs text-text-muted">
                                (max {c.max_increase_limit}%)
                              </span>
                            )}
                          </td>
                          <td className="hidden px-4 py-3 text-sm sm:table-cell sm:px-6 sm:py-4">
                            {c.end_date || "—"}
                          </td>
                          <td className="px-4 py-3 sm:px-6 sm:py-4">
                            <div className="flex flex-col items-start gap-1">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge(st)}`}>
                                {STATUS_MAP[st]?.label || st}
                              </span>
                              {urgency && (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${urgency.cls}`}>
                                  {urgency.text}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right sm:px-6 sm:py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => navigate(`/renewal-review/${c.id}`)}
                                className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
                              >
                                Review
                              </button>
                              {user?.role !== "client" && (
                                <button
                                  onClick={() => setDeleteTarget(c.id)}
                                  className="flex items-center justify-center rounded-lg p-1.5 text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-500 opacity-0 group-hover:opacity-100"
                                  title="Delete"
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    delete
                                  </span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── CONTRACT DETAIL ─── */
function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contract, setContract] = useState(null);
  const [calc, setCalc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [toast, setToast] = useState(null);

  const [editAmount, setEditAmount] = useState("");
  const [editRule, setEditRule] = useState("TUFE");
  const [editMaxLimit, setEditMaxLimit] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Two-phase approval state
  const [sendingToClient, setSendingToClient] = useState(false);
  const [showClientRejectModal, setShowClientRejectModal] = useState(false);
  const [clientRejectReason, setClientRejectReason] = useState("");
  const [clientActing, setClientActing] = useState(false);
  const [showSendToClientModal, setShowSendToClientModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, k] = await Promise.all([getContract(id), getCalculation(id)]);
      setContract(c);
      setCalc(k);
      setEditAmount(c.previous_amount || "");
      setEditRule(c.inflation_base_rule || "TUFE");
      setEditMaxLimit(c.max_increase_limit ?? "");
      setEditEndDate(c.end_date || "");
    } catch (err) {
      console.error("Contract detail error:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFieldChange = (setter) => (e) => {
    setter(e.target.value);
    setDirty(true);
  };

  const amount = Number(editAmount) || 0;
  const tufe = calc?.tufe_rate || 0;
  const ufe = calc?.ufe_rate || 0;

  let liveAdjustment = 0;
  if (editRule === "TUFE") liveAdjustment = tufe;
  else if (editRule === "UFE") liveAdjustment = ufe;
  else liveAdjustment = (tufe + ufe) / 2;

  let liveCapped = false;
  const maxLimitNum = editMaxLimit !== "" ? Number(editMaxLimit) : null;
  if (maxLimitNum && liveAdjustment > maxLimitNum) {
    liveAdjustment = maxLimitNum;
    liveCapped = true;
  }

  const liveNewPrice = amount * (1 + liveAdjustment / 100);
  const liveDifference = liveNewPrice - amount;

  const companyName = calc?.company_name || "—";

  const formatCurrency = useCallback(
    (n, curr = "TRY") =>
      new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: curr || "TRY",
      }).format(n),
    [],
  );

  const handleGenerateEmail = async () => {
    setAiLoading(true);
    try {
      const result = await generateEmailDraft(id, {
        new_amount: Math.round(liveNewPrice * 100) / 100,
        applied_adjustment: Math.round(liveAdjustment * 100) / 100,
        inflation_base_rule: editRule,
      });
      setEmailSubject(result.subject || "");
      setEmailBody(result.body || "");
      setAiGenerated(true);
      showToast("AI email draft generated");
    } catch (err) {
      showToast("AI draft error: " + err.message, "error");
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadPdf(id);
    } catch (err) {
      showToast("Failed to download PDF: " + err.message, "error");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await saveDraft(id, {
        previous_amount: amount,
        inflation_base_rule: editRule,
        max_increase_limit: maxLimitNum,
        end_date: editEndDate || null,
        new_amount: Math.round(liveNewPrice * 100) / 100,
        applied_adjustment: Math.round(liveAdjustment * 100) / 100,
      });
      setDirty(false);
      showToast("Draft saved");
    } catch (err) {
      showToast("Save error: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    setSaving(true);
    try {
      await rejectContract(id, rejectNotes);
      setShowRejectModal(false);
      showToast("Contract rejected");
      setTimeout(() => navigate("/renewal-review"), 1500);
    } catch (err) {
      showToast("Rejection error: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      await approveContract(id, {
        new_amount: Math.round(liveNewPrice * 100) / 100,
        applied_adjustment: Math.round(liveAdjustment * 100) / 100,
      });
      setShowApproveModal(false);
      showToast("Contract approved!");
      setTimeout(() => navigate("/renewal-review"), 1500);
    } catch (err) {
      showToast("Approval error: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSendToClient = async () => {
    setSendingToClient(true);
    try {
      await sendContractToClient(id, {
        new_amount: Math.round(liveNewPrice * 100) / 100,
        applied_adjustment: Math.round(liveAdjustment * 100) / 100,
        email_subject: emailSubject,
        email_body: emailBody,
      });
      setShowSendToClientModal(false);
      showToast("Contract sent to client for review!");
      setTimeout(() => navigate("/renewal-review"), 1500);
    } catch (err) {
      showToast("Failed to send: " + err.message, "error");
    } finally {
      setSendingToClient(false);
    }
  };

  const handleClientApprove = async () => {
    setClientActing(true);
    try {
      await clientApproveContract(id);
      showToast("Contract accepted! Confirmation email sent.");
      setTimeout(() => load(), 500);
    } catch (err) {
      showToast("Failed to accept: " + err.message, "error");
    } finally {
      setClientActing(false);
    }
  };

  const handleClientReject = async () => {
    if (!clientRejectReason.trim()) {
      showToast("Please provide a rejection reason.", "error");
      return;
    }
    setClientActing(true);
    try {
      await clientRejectContract(id, clientRejectReason);
      setShowClientRejectModal(false);
      showToast("Contract rejected.");
      setTimeout(() => load(), 500);
    } catch (err) {
      showToast("Failed to reject: " + err.message, "error");
    } finally {
      setClientActing(false);
    }
  };

  if (loading) return <PageLoader />;

  if (!contract || !calc) {
    return (
      <div className="flex h-full items-center justify-center bg-bg">
        <p className="text-text-muted">Contract not found.</p>
      </div>
    );
  }

  const contractStatus = contract.status || "active";
  const isFinalized = [
    "approved",
    "pending_client",
    "client_approved",
    "client_rejected",
  ].includes(contractStatus);

  const badge = {
    active: { text: "Active", cls: "bg-emerald-500/10 text-emerald-500" },
    draft: { text: "Draft", cls: "bg-amber-500/10 text-amber-500" },
    approved: { text: "Approved", cls: "bg-primary/10 text-primary" },
    pending_client: {
      text: "Awaiting Client",
      cls: "bg-violet-500/10 text-violet-500",
    },
    client_approved: {
      text: "Client Approved",
      cls: "bg-emerald-600/10 text-emerald-600",
    },
    client_rejected: {
      text: "Client Rejected",
      cls: "bg-red-600/10 text-red-600",
    },
    rejected: { text: "Rejected", cls: "bg-red-500/10 text-red-500" },
  }[contractStatus] || {
    text: "Active",
    cls: "bg-emerald-500/10 text-emerald-500",
  };

  const inputCls =
    "w-full rounded-md border border-border bg-surface-alt px-3 py-1.5 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-text">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-6 top-20 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "error"
              ? "bg-red-500 text-white"
              : "bg-emerald-500 text-white"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === "error" ? "error" : "check_circle"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Internal Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <span className="material-symbols-outlined text-xl text-red-500">
                  block
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold">Reject Renewal</h3>
                <p className="text-sm text-text-muted">{companyName}</p>
              </div>
            </div>
            <textarea
              className="h-28 w-full resize-none rounded-lg border border-border bg-surface-alt p-3 text-sm text-text outline-none focus:border-primary"
              placeholder="Rejection reason (optional)..."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={saving}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {saving ? "Rejecting..." : "Reject Contract"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Reject Modal */}
      {showClientRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <span className="material-symbols-outlined text-xl text-red-500">
                  block
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold">Reject Contract</h3>
                <p className="text-sm text-text-muted">
                  Please provide a reason for rejection.
                </p>
              </div>
            </div>
            <textarea
              className="h-32 w-full resize-none rounded-lg border border-border bg-surface-alt p-3 text-sm text-text outline-none focus:border-red-500"
              placeholder="Rejection reason (required)..."
              value={clientRejectReason}
              onChange={(e) => setClientRejectReason(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowClientRejectModal(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleClientReject}
                disabled={clientActing || !clientRejectReason.trim()}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {clientActing ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal (internal) */}
      <ConfirmModal
        open={showApproveModal}
        title="Approve & Send Renewal"
        message={`${companyName} - This action is final.`}
        details={
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-text-muted">Previous Amount</span>
              <span className="font-semibold">{formatCurrency(amount, contract?.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Adjustment ({editRule})</span>
              <span className="font-semibold text-amber-500">
                +{liveAdjustment.toFixed(1)}%
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between">
              <span className="font-bold">New Amount</span>
              <span className="font-bold text-primary">
                {formatCurrency(liveNewPrice, contract?.currency)}
              </span>
            </div>
          </div>
        }
        confirmText="Approve & Send"
        onConfirm={handleApprove}
        onCancel={() => setShowApproveModal(false)}
        loading={saving}
      />

      {/* Send to Client Modal */}
      <ConfirmModal
        open={showSendToClientModal}
        title="Send to Client for Review"
        message={`${companyName} — The client will be notified to review and approve.`}
        details={
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-text-muted">New Amount</span>
                <span className="font-semibold text-primary">
                  {formatCurrency(liveNewPrice)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Adjustment</span>
                <span className="font-semibold text-amber-500">
                  +{liveAdjustment.toFixed(1)}%
                </span>
              </div>
            </div>
            
            <div className="rounded border border-border bg-surface-alt p-3">
              <p className="text-xs text-text-muted mb-1">Email to be sent:</p>
              <p className="text-sm font-semibold truncate">{emailSubject || "Default Notification"}</p>
              <p className="text-xs text-text-muted truncate mt-1">
                {emailBody ? "Custom email body will be included." : "Default email template will be used."}
              </p>
            </div>
          </div>
        }
        confirmText="Send to Client"
        onConfirm={handleSendToClient}
        onCancel={() => setShowSendToClientModal(false)}
        loading={sendingToClient}
      />

      {/* ── Header ── */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-4 sm:px-8 sm:py-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/renewal-review")}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold transition-colors hover:bg-hover"
          >
            <span className="material-symbols-outlined text-base align-middle">
              arrow_back
            </span>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold sm:text-2xl">Renewal Review</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}
              >
                {badge.text}
              </span>
            </div>
            <p className="mt-1 hidden text-sm text-text-muted sm:block">
              Review and approve contract renewals.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold transition-colors hover:bg-hover disabled:opacity-50 sm:px-4 sm:text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">
              picture_as_pdf
            </span>
            {pdfLoading ? "Generating..." : "PDF"}
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              {companyName} Service Agreement
            </h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-text-muted">
              <span className="material-symbols-outlined text-base">timer</span>
              End date: {editEndDate || "—"} &bull; ID:{" "}
              {contract.id.slice(0, 8)}
            </p>
          </div>

          {/* Stats Row */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:mb-8 sm:gap-6 md:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
              <p className="text-xs font-medium text-text-muted sm:text-sm">
                Current Contract Value
              </p>
              <p className="mt-2 text-xl font-bold sm:text-3xl">
                {formatCurrency(amount)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
              <p className="text-xs font-medium text-text-muted sm:text-sm">
                Inflation Adjustment ({editRule})
              </p>
              <p className="mt-2 text-xl font-bold text-amber-500 sm:text-3xl">
                +{liveAdjustment.toFixed(1)}%
              </p>
              {liveCapped && (
                <p className="mt-1 text-xs font-medium text-red-500">
                  Max limit applied
                </p>
              )}
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
              <p className="text-xs font-medium text-text-muted sm:text-sm">
                Price Difference
              </p>
              <p className="mt-2 text-xl font-bold text-amber-500 sm:text-3xl">
                +{formatCurrency(liveDifference)}
              </p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary-soft p-4 sm:p-6">
              <p className="text-xs font-bold text-primary sm:text-sm">
                Calculated New Price
              </p>
              <p className="mt-2 text-2xl font-black text-primary sm:text-4xl">
                {formatCurrency(liveNewPrice)}
              </p>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 gap-6 sm:gap-8 xl:grid-cols-12">
            {/* ── Left Column ── */}
            <div className="space-y-6 sm:space-y-8 xl:col-span-7">
              {/* Client Decision Panel — only visible to client when pending */}
              {user?.role === "client" &&
                contractStatus === "pending_client" && (
                  <section className="rounded-xl border-2 border-violet-500/30 bg-violet-500/5 p-4 sm:p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10">
                        <span className="material-symbols-outlined text-xl text-violet-500">
                          pending_actions
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">
                          Contract Awaiting Your Decision
                        </h3>
                        <p className="text-sm text-text-muted">
                          Please review the terms and accept or reject.
                        </p>
                      </div>
                    </div>
                    <div className="mb-4 rounded-lg border border-border bg-surface p-4 text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-text-muted">
                          New Contract Value
                        </span>
                        <span className="font-bold text-primary text-base">
                          {formatCurrency(liveNewPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">
                          Inflation Adjustment
                        </span>
                        <span className="font-semibold text-amber-500">
                          +{liveAdjustment.toFixed(1)}% ({editRule})
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleClientApprove}
                        disabled={clientActing}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          task_alt
                        </span>
                        {clientActing ? "Processing..." : "Accept Contract"}
                      </button>
                      <button
                        onClick={() => setShowClientRejectModal(true)}
                        disabled={clientActing}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-red-500/30 py-3 text-sm font-bold text-red-500 transition-colors hover:bg-red-500/5 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          block
                        </span>
                        Reject Contract
                      </button>
                    </div>
                  </section>
                )}

              {/* Client Rejection Reason Panel */}
              {contractStatus === "client_rejected" &&
                contract.client_rejection_reason && (
                  <section className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 sm:p-6">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-red-500">
                        cancel
                      </span>
                      <h3 className="font-bold text-red-500">
                        Client Rejection Reason
                      </h3>
                    </div>
                    <p className="text-sm text-text">
                      {contract.client_rejection_reason}
                    </p>
                  </section>
                )}

              {/* Editable Calculation */}
              {user?.role !== "client" && (
                <section className="overflow-hidden rounded-xl border border-border bg-surface">
                  <div className="flex items-center justify-between border-b border-border bg-surface-alt px-4 py-3 sm:px-6 sm:py-4">
                    <h3 className="text-lg font-bold">Calculation Logic</h3>
                    {dirty && (
                      <span className="text-xs font-medium text-amber-500">
                        Unsaved changes
                      </span>
                    )}
                  </div>
                  <div className="space-y-5 p-4 text-sm sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-text-muted">Base Rate (TRY)</span>
                      <input
                        type="number"
                        className={`max-w-[200px] text-right ${inputCls}`}
                        value={editAmount}
                        onChange={handleFieldChange(setEditAmount)}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-text-muted">End Date</span>
                      <input
                        type="date"
                        className={`max-w-[200px] ${inputCls}`}
                        value={editEndDate}
                        onChange={handleFieldChange(setEditEndDate)}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-text-muted">Inflation Rule</span>
                      <select
                        className={`max-w-[200px] ${inputCls}`}
                        value={editRule}
                        onChange={handleFieldChange(setEditRule)}
                      >
                        <option value="TUFE">TUFE</option>
                        <option value="UFE">UFE</option>
                        <option value="TUFE+UFE">TUFE + UFE (Avg)</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-text-muted">
                        Max Increase Limit (%)
                      </span>
                      <input
                        type="number"
                        className={`max-w-[200px] text-right ${inputCls}`}
                        placeholder="No limit"
                        value={editMaxLimit}
                        onChange={handleFieldChange(setEditMaxLimit)}
                      />
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex justify-between py-1">
                      <span className="text-text-muted" title="Consumer Price Index (TCMB)">TUFE (CPI)</span>
                      <span className="font-medium">+{tufe.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-text-muted" title="Producer Price Index (TCMB)">UFE (PPI)</span>
                      <span className="font-medium">+{ufe.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-text-muted" title="TCMB Official Exchange Rate">USD/TRY</span>
                      <span className="font-medium">
                        {calc.usd_rate.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-text-muted" title="TCMB Official Exchange Rate">EUR/TRY</span>
                      <span className="font-medium">
                        {calc.eur_rate.toFixed(4)}
                      </span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex justify-between">
                      <span className="font-bold">Total Adjustment</span>
                      <span className="font-bold text-primary">
                        {liveAdjustment.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">New Price</span>
                      <span className="font-bold text-primary">
                        {formatCurrency(liveNewPrice)}
                      </span>
                    </div>
                  </div>
                </section>
              )}

              {/* Addendum Preview */}
              <section className="rounded-xl border border-border bg-surface">
                <div className="flex items-center justify-between border-b border-border bg-surface-alt px-4 py-3 sm:px-6 sm:py-4">
                  <div>
                    <h3 className="text-lg font-bold">Generated Addendum</h3>
                    <p className="text-xs text-text-muted">
                      Preview — download full PDF above
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={pdfLoading}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      download
                    </span>
                    PDF
                  </button>
                </div>
                <div className="max-h-[600px] overflow-y-auto bg-neutral-200 p-4 sm:p-8">
                  <div className="mx-auto min-h-[842px] w-full max-w-[595px] bg-white p-8 font-serif text-[10px] text-gray-800 shadow-lg sm:p-12">
                    <h1 className="mb-1 font-sans text-sm font-bold text-blue-600">
                      RATEGUARD
                    </h1>
                    <hr className="mb-4 border-blue-600" />
                    <h2 className="mb-4 text-lg font-bold">
                      CONTRACT ADDENDUM
                    </h2>
                    <p className="mb-1 text-[9px] text-gray-500">
                      Ref: SA-{contract.id.slice(0, 8).toUpperCase()}-RNW |
                      Date: {new Date().toLocaleDateString("tr-TR")}
                    </p>
                    <div className="my-4 h-px bg-gray-200" />
                    <p className="mb-2 font-bold">1. PARTIES</p>
                    <p className="mb-1">Service Provider: RateGuard</p>
                    <p className="mb-4">Client: {companyName}</p>
                    <p className="mb-2 font-bold">2. PRICE CALCULATION</p>
                    <table className="mt-2 w-full text-left">
                      <tbody>
                        <tr className="border-b border-gray-300 bg-blue-50">
                          <th className="py-1.5 pl-2 font-semibold">
                            Description
                          </th>
                          <th className="py-1.5 pr-2 text-right font-semibold">
                            Amount
                          </th>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-1.5 pl-2">
                            Current Contract Value
                          </td>
                          <td className="py-1.5 pr-2 text-right">
                            {formatCurrency(amount)}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-1.5 pl-2">
                            Applied Index ({editRule})
                          </td>
                          <td className="py-1.5 pr-2 text-right">
                            %{liveAdjustment.toFixed(2)}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-1.5 pl-2">Difference</td>
                          <td className="py-1.5 pr-2 text-right">
                            +{formatCurrency(liveDifference)}
                          </td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="py-2 pl-2 font-bold">
                            NEW CONTRACT VALUE
                          </td>
                          <td className="py-2 pr-2 text-right text-sm font-bold text-blue-700">
                            {formatCurrency(liveNewPrice)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="mt-8">
                      <p className="mb-2 font-bold">3. SIGNATURES</p>
                      <div className="mt-4 flex justify-between">
                        <div>
                          <p className="mb-6">Service Provider</p>
                          <p>_________________________</p>
                          <p className="text-[8px] text-gray-400">
                            Signature / Stamp
                          </p>
                        </div>
                        <div>
                          <p className="mb-6">Client</p>
                          <p>_________________________</p>
                          <p className="text-[8px] text-gray-400">
                            Signature / Stamp
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Create New Version — shown to staff when client has rejected */}
              {contractStatus === "client_rejected" &&
                ["finance", "company_admin", "super_admin", "sales"].includes(
                  user?.role,
                ) && (
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-6">
                    <div>
                      <p className="font-semibold text-amber-600">
                        Client rejected this contract.
                      </p>
                      <p className="mt-1 text-sm text-text-muted">
                        You can create a new version with revised terms.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate("/renewal-review")}
                      className="flex shrink-0 items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-600"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        add_circle
                      </span>
                      New Version
                    </button>
                  </div>
                )}
            </div>

            {/* ── Right Column ── */}
            <div className="space-y-4 xl:col-span-5">
              {/* === CONTRACT ACTIONS CARD === */}
              <section className="overflow-hidden rounded-xl border border-border bg-surface">
                <div className="flex items-center justify-between border-b border-border bg-surface-alt px-4 py-3 sm:px-5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-text-muted">
                      bolt
                    </span>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted">
                      Quick Actions
                    </h3>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}
                  >
                    {badge.text}
                  </span>
                </div>
                <div className="space-y-3 p-4 sm:p-5">
                  {/* Mini calculation summary */}
                  <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-border bg-surface-alt text-xs">
                    <div className="p-2.5 text-center">
                      <p className="mb-1 text-text-muted">Current</p>
                      <p className="truncate text-[11px] font-bold leading-tight">
                        {formatCurrency(amount)}
                      </p>
                    </div>
                    <div className="border-x border-border p-2.5 text-center">
                      <p className="mb-1 text-text-muted">Adj. ({editRule})</p>
                      <p className="font-bold text-amber-500">
                        +{liveAdjustment.toFixed(1)}%
                        {liveCapped && (
                          <span className="ml-0.5 text-red-500">*</span>
                        )}
                      </p>
                    </div>
                    <div className="p-2.5 text-center">
                      <p className="mb-1 text-text-muted">New Price</p>
                      <p className="truncate text-[11px] font-bold leading-tight text-primary">
                        {formatCurrency(liveNewPrice)}
                      </p>
                    </div>
                  </div>

                  {/* Primary CTA: Send to Client */}
                  {[
                    "finance",
                    "company_admin",
                    "super_admin",
                    "sales",
                  ].includes(user?.role) && (
                    <button
                      onClick={() => setShowSendToClientModal(true)}
                      disabled={
                        saving ||
                        [
                          "pending_client",
                          "client_approved",
                          "rejected",
                        ].includes(contractStatus)
                      }
                      className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold transition-colors ${
                        [
                          "pending_client",
                          "client_approved",
                          "rejected",
                        ].includes(contractStatus)
                          ? "cursor-not-allowed border border-border bg-surface-alt text-text-muted"
                          : "bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {contractStatus === "pending_client"
                          ? "hourglass_empty"
                          : contractStatus === "client_approved"
                            ? "task_alt"
                            : "send"}
                      </span>
                      {contractStatus === "pending_client"
                        ? "Awaiting Client Response"
                        : contractStatus === "client_approved"
                          ? "Client Approved ✓"
                          : contractStatus === "client_rejected"
                            ? "Re-send to Client"
                            : contractStatus === "rejected"
                              ? "Internally Rejected"
                              : "Send to Client"}
                    </button>
                  )}

                  {/* Finance/Admin: Save Draft */}
                  {["finance", "company_admin", "super_admin"].includes(
                    user?.role,
                  ) && (
                    <div className="w-full">
                      <button
                        onClick={handleSaveDraft}
                        disabled={saving || !dirty}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface py-2.5 text-xs font-semibold transition-colors hover:bg-hover disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          save
                        </span>
                        {saving ? "Saving..." : "Save Draft"}
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Chat Panel */}
              <ChatPanel contractId={id} />

              {/* AI Email Composer */}
              <section className="rounded-xl border border-border bg-surface">
                <div className="flex items-center justify-between border-b border-border bg-primary-soft px-4 py-3 sm:px-6 sm:py-4">
                  <h3 className="text-lg font-bold text-primary">
                    AI Email Composer
                  </h3>
                  <span
                    className={`rounded px-2 py-1 text-xs font-bold uppercase tracking-wider ${aiGenerated ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"}`}
                  >
                    {aiGenerated ? "AI Generated" : "Draft"}
                  </span>
                </div>
                <div className="flex flex-col gap-4 p-4 sm:p-6">
                  {!aiGenerated && !emailBody ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-border p-8 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
                        <span className="material-symbols-outlined text-3xl text-primary">
                          auto_awesome
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text">
                          Generate Email with AI
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          Gemini AI drafts a professional email based on the
                          client's communication tone
                        </p>
                      </div>
                      <button
                        onClick={handleGenerateEmail}
                        disabled={aiLoading || isFinalized}
                        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-primary-dark hover:shadow-lg disabled:opacity-50"
                      >
                        {aiLoading ? (
                          <>
                            <svg
                              className="h-4 w-4 animate-spin"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                            Generating...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[18px]">
                              auto_awesome
                            </span>
                            Generate with Gemini AI
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                          Subject:
                        </label>
                        <button
                          onClick={handleGenerateEmail}
                          disabled={aiLoading}
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary-soft disabled:opacity-50"
                          title="Regenerate with AI"
                        >
                          {aiLoading ? (
                            <svg
                              className="h-3.5 w-3.5 animate-spin"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                          ) : (
                            <span className="material-symbols-outlined text-[16px]">
                              refresh
                            </span>
                          )}
                          Regenerate
                        </button>
                      </div>
                      <input
                        className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        type="text"
                      />
                      <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                        Message Body:
                      </label>
                      <textarea
                        className="h-64 resize-none rounded-lg border border-border bg-surface-alt p-4 text-sm leading-relaxed text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                      />
                    </>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContractReviewPage() {
  const { id } = useParams();
  return id ? <ContractDetail /> : <ContractList />;
}
