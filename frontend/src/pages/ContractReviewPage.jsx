import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { PageLoader } from "../components/Spinner";
import ContractExpiryCalendar from "../components/ContractExpiryCalendar";
import ChatPanel from "../components/ChatPanel";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useRateBot } from "../contexts/RateBotContext";
import {
  getContracts,
  getContract,
  createContract,
  deleteContract,
  getContractCounterparties,
  getCalculation,
  getMarketData,
  getMarketDataSources,
  downloadPdf,
  saveDraft,
  rejectContract,
  approveContract,
  generateEmailDraft,
  analyzeContractTone,
  sendContractToClient,
  clientApproveContract,
  clientRejectContract,
  notifySales,
  getApprovedAgreements,
  downloadApprovedPdf,
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

const RULE_OPTIONS = ["All", "TUFE", "UFE", "TUFE+UFE", "CUSTOM"];

const DEFAULT_MARKET_SOURCE = {
  key: "tcmb_evds",
  name: "TCMB EVDS",
  institution: "Central Bank of the Republic of Turkiye (TCMB)",
  method: "Official EVDS API",
};

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

/* ─── FINANCE NOTIFY SALES BUTTON ─── */
function FinanceNotifySalesButton({ contractId, contract }) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleNotify = async () => {
    setLoading(true);
    try {
      const res = await notifySales(contractId);
      if (res.notified > 0) {
        toastSuccess(
          `Sales team notified (${res.notified} member${res.notified > 1 ? "s" : ""})!`,
        );
      } else {
        toastSuccess(res.message || "Notification sent.");
      }
      setSent(true);
    } catch (err) {
      toastError("Failed to notify sales: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const contractStatus = contract?.status || "active";
  const disabled =
    loading || ["pending_client", "client_approved"].includes(contractStatus);

  return (
    <button
      onClick={handleNotify}
      disabled={disabled}
      className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold transition-colors ${
        sent
          ? "border border-emerald-500/30 bg-emerald-500/5 text-emerald-500"
          : disabled
            ? "cursor-not-allowed border border-border bg-surface-alt text-text-muted"
            : "bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">
        {sent ? "check_circle" : "forward_to_inbox"}
      </span>
      {loading
        ? "Notifying..."
        : sent
          ? "Sales Notified ✓"
          : "Notify Sales Team"}
    </button>
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
  const [endDateFrom, setEndDateFrom] = useState("");
  const [endDateTo, setEndDateTo] = useState("");
  const [calendarSelectedDay, setCalendarSelectedDay] = useState(null);
  const [marketRates, setMarketRates] = useState({
    tufe: null,
    ufe: null,
    source: DEFAULT_MARKET_SOURCE,
  });
  const [marketSources, setMarketSources] = useState([DEFAULT_MARKET_SOURCE]);
  const [form, setForm] = useState({
    company_id: "",
    previous_amount: "",
    currency: "TRY",
    contract_type: "service_contract",
    end_date: "",
    inflation_base_rule: "TUFE",
    max_increase_limit: "",
    inflation_data_source: DEFAULT_MARKET_SOURCE.key,
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
      const [c, co, md, sources] = await Promise.all([
        getContracts(contractParams),
        getContractCounterparties(),
        getMarketData({ source: form.inflation_data_source }).catch(() => null),
        getMarketDataSources().catch(() => []),
      ]);
      setContracts(c);
      setCompanies(Array.isArray(co) ? co : []);
      if (Array.isArray(sources) && sources.length) {
        setMarketSources(sources);
      }
      if (md) {
        applyMarketData(md);
        // Seed the initial value for TUFE since it is the default selected rule
        if (md.tufe != null || md.tufe_yoy != null) {
          setForm((prev) => ({
            ...prev,
            max_increase_limit:
              prev.max_increase_limit ||
              String(parseFloat(md.tufe ?? md.tufe_yoy).toFixed(1)),
          }));
        }
      }
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, form.inflation_data_source]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRuleChange = (rule) => {
    // For preset rules, auto-fill max_increase_limit and lock it
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
    // For CUSTOM, keep existing or clear
    setForm((prev) => ({
      ...prev,
      inflation_base_rule: rule,
      max_increase_limit: rule === "CUSTOM" ? "" : suggested,
    }));
  };

  const applyMarketData = (md) => {
    setMarketRates({
      tufe: md.tufe ?? md.tufe_yoy,
      ufe: md.ufe ?? md.ufe_yoy,
      source: {
        key: md.source_key || md.data_source?.key || DEFAULT_MARKET_SOURCE.key,
        name: md.source_name || md.data_source?.name || DEFAULT_MARKET_SOURCE.name,
        institution:
          md.source_institution ||
          md.data_source?.institution ||
          DEFAULT_MARKET_SOURCE.institution,
        method: md.source_method || md.data_source?.method || DEFAULT_MARKET_SOURCE.method,
      },
    });
  };

  const handleSourceChange = async (sourceKey) => {
    setForm((prev) => ({
      ...prev,
      inflation_data_source: sourceKey,
      max_increase_limit: prev.inflation_base_rule === "CUSTOM" ? prev.max_increase_limit : "",
    }));
    try {
      const md = await getMarketData({ source: sourceKey });
      applyMarketData(md);
      const nextTufe = md.tufe ?? md.tufe_yoy;
      const nextUfe = md.ufe ?? md.ufe_yoy;
      setForm((prev) => {
        if (prev.inflation_base_rule === "CUSTOM") return prev;
        let suggested = "";
        if (prev.inflation_base_rule === "TUFE" && nextTufe != null) {
          suggested = String(parseFloat(nextTufe).toFixed(1));
        } else if (prev.inflation_base_rule === "UFE" && nextUfe != null) {
          suggested = String(parseFloat(nextUfe).toFixed(1));
        } else if (
          prev.inflation_base_rule === "TUFE+UFE" &&
          nextTufe != null &&
          nextUfe != null
        ) {
          suggested = String(
            ((parseFloat(nextTufe) + parseFloat(nextUfe)) / 2).toFixed(1),
          );
        }
        return { ...prev, max_increase_limit: suggested };
      });
    } catch (err) {
      toastError("Failed to load inflation source: " + err.message);
    }
  };

  const handleCreate = async () => {
    if (!form.company_id) {
      toastError("Please select a company.");
      return;
    }
    if (!form.previous_amount || Number(form.previous_amount) <= 0) {
      toastError("Please enter a valid contract amount.");
      return;
    }
    if (!form.end_date) {
      toastError("Please select a contract end date.");
      return;
    }
    if (
      form.inflation_base_rule === "CUSTOM" &&
      (!form.max_increase_limit || Number(form.max_increase_limit) <= 0)
    ) {
      toastError(
        "Please enter a max increase value for the custom inflation rule.",
      );
      return;
    }
    setSaving(true);
    try {
      // Store CUSTOM as a plain numeric rule in DB, actual rule label stored separately
      const inflationRule =
        form.inflation_base_rule === "CUSTOM"
          ? "CUSTOM"
          : form.inflation_base_rule;
      await createContract({
        ...form,
        inflation_base_rule: inflationRule,
        previous_amount: Number(form.previous_amount),
        currency: form.currency,
        inflation_data_source: form.inflation_data_source,
        inflation_source_name: marketRates.source?.name,
        inflation_source_institution: marketRates.source?.institution,
        inflation_source_method: marketRates.source?.method,
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
        inflation_data_source: DEFAULT_MARKET_SOURCE.key,
      });
      // Reseed the limit on reset
      if (marketRates.tufe != null) {
        setForm((prev) => ({
          ...prev,
          max_increase_limit: String(parseFloat(marketRates.tufe).toFixed(1)),
        }));
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

    const csvContent = [headers, ...rows]
      .map((e) => e.map((val) => `"${val}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Contracts_Export_${new Date().toISOString().split("T")[0]}.csv`,
    );
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

  const listAfterTextFilters = useMemo(() => {
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

  const calendarEvents = useMemo(() => {
    return listAfterTextFilters
      .filter((c) => c.end_date)
      .map((c) => ({
        id: c.id,
        end_date: c.end_date,
        company_name: c.companies?.company_name,
        days_until: daysUntil(c.end_date),
      }));
  }, [listAfterTextFilters]);

  const filtered = useMemo(() => {
    let list = listAfterTextFilters;
    if (endDateFrom) {
      list = list.filter((c) => c.end_date && c.end_date >= endDateFrom);
    }
    if (endDateTo) {
      list = list.filter((c) => c.end_date && c.end_date <= endDateTo);
    }
    if (calendarSelectedDay) {
      list = list.filter(
        (c) => (c.end_date || "").slice(0, 10) === calendarSelectedDay,
      );
    }
    return list;
  }, [listAfterTextFilters, endDateFrom, endDateTo, calendarSelectedDay]);

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

  const canManageClients =
    user?.role === "super_admin" || user?.role === "company_admin";

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
        {!["client", "user"].includes(user?.role) && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold transition-colors hover:bg-hover sm:px-4 sm:text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">
                download
              </span>
              Export
            </button>
            {["company_admin", "finance", "super_admin"].includes(
              user?.role,
            ) && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-dark sm:px-4 sm:text-sm"
              >
                {showForm ? "Cancel" : "New Contract"}
              </button>
            )}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* New Contract Form */}
          {showForm && (
            <div className="rounded-xl border border-primary/20 bg-primary-soft p-4 sm:p-6">
              <h3 className="mb-4 text-lg font-bold">Create New Contract</h3>
              <div className="space-y-4">
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
                    title={
                      companies.length === 0 && user?.role !== "client"
                        ? canManageClients
                          ? "Add a client company on the Clients page first."
                          : "Ask a company admin to add client companies first."
                        : undefined
                    }
                  >
                    <option value="">Select company...</option>
                    {companies.map((co) => (
                      <option key={co.id} value={co.id}>
                        {co.company_name}
                      </option>
                    ))}
                  </select>
                  {companies.length === 0 &&
                    !["client", "user"].includes(user?.role) && (
                      <p className="mt-2 text-xs leading-relaxed text-text-muted">
                        No companies available in the directory. Please contact
                        a Super Admin.
                      </p>
                    )}
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
                    <option value="maintenance_agreement">
                      Maintenance Agreement
                    </option>
                    <option value="supply_agreement">Supply Agreement</option>
                  </select>
                </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div>
                  <label className="mb-1 flex h-5 items-center text-xs font-semibold uppercase text-text-muted">
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
                  <label className="mb-1 flex h-5 items-center text-xs font-semibold uppercase text-text-muted">
                    Inflation Data Source
                  </label>
                  <select
                    className={inputCls}
                    value={form.inflation_data_source}
                    onChange={(e) => handleSourceChange(e.target.value)}
                  >
                    {marketSources.map((source) => (
                      <option key={source.key} value={source.key}>
                        {source.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] leading-snug text-text-muted">
                    {marketRates.source?.name || "TCMB EVDS"} via{" "}
                    {marketRates.source?.method || "Official API"}.
                  </p>
                  </div>
                  <div>
                  <label className="mb-1 flex h-5 items-center text-xs font-semibold uppercase text-text-muted">
                    Inflation Rule
                  </label>
                  <select
                    className={inputCls}
                    value={form.inflation_base_rule}
                    onChange={(e) => handleRuleChange(e.target.value)}
                  >
                    <option value="TUFE">
                      TUFE
                      {marketRates.tufe != null
                        ? ` (${parseFloat(marketRates.tufe).toFixed(1)}%)`
                        : ""}
                    </option>
                    <option value="UFE">
                      UFE
                      {marketRates.ufe != null
                        ? ` (${parseFloat(marketRates.ufe).toFixed(1)}%)`
                        : ""}
                    </option>
                    <option value="TUFE+UFE">
                      TUFE + UFE — Average
                      {marketRates.tufe != null && marketRates.ufe != null
                        ? ` (${((parseFloat(marketRates.tufe) + parseFloat(marketRates.ufe)) / 2).toFixed(1)}%)`
                        : ""}
                    </option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                  </div>
                  <div>
                  <label className="mb-1 flex h-5 items-center justify-between gap-2 text-xs font-semibold uppercase text-text-muted">
                    <span>Max Increase (%)</span>
                    {form.inflation_base_rule !== "CUSTOM" &&
                      form.max_increase_limit && (
                        <span className="flex shrink-0 items-center gap-1 text-[10px] font-normal normal-case text-amber-500">
                          <span className="material-symbols-outlined text-[12px]">
                            lock
                          </span>
                          Auto
                        </span>
                      )}
                  </label>
                  <input
                    className={`${inputCls} ${form.inflation_base_rule !== "CUSTOM" ? "cursor-not-allowed opacity-70" : ""}`}
                    type="number"
                    step="0.1"
                    min="0"
                    max="200"
                    value={form.max_increase_limit}
                    placeholder={
                      form.inflation_base_rule === "CUSTOM"
                        ? "Enter custom % limit"
                        : "Auto-filled"
                    }
                    readOnly={form.inflation_base_rule !== "CUSTOM"}
                    onChange={(e) =>
                      form.inflation_base_rule === "CUSTOM" &&
                      setForm({ ...form, max_increase_limit: e.target.value })
                    }
                  />
                  {form.inflation_base_rule !== "CUSTOM" && (
                    <p className="mt-1 text-[10px] text-text-muted">
                      Select <strong>Custom</strong> to enter a manual value.
                    </p>
                  )}
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleCreate}
                    disabled={saving || !form.company_id || !form.previous_amount}
                    className="w-full max-w-sm rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
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

          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-3 sm:p-4">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                End date from
              </label>
              <input
                type="date"
                value={endDateFrom}
                onChange={(e) => setEndDateFrom(e.target.value)}
                className={`${inputCls} w-auto min-w-[10.5rem]`}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                End date through
              </label>
              <input
                type="date"
                value={endDateTo}
                onChange={(e) => setEndDateTo(e.target.value)}
                className={`${inputCls} w-auto min-w-[10.5rem]`}
              />
            </div>
            {(endDateFrom || endDateTo || calendarSelectedDay) && (
              <button
                type="button"
                onClick={() => {
                  setEndDateFrom("");
                  setEndDateTo("");
                  setCalendarSelectedDay(null);
                }}
                className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-muted transition-colors hover:bg-hover hover:text-text"
              >
                Clear dates
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_290px] xl:items-start">
            <div>
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
                      <th className="px-4 py-3 sm:px-6 sm:py-4">
                        Rule & Limit
                      </th>
                      <th className="hidden px-4 py-3 sm:table-cell sm:px-6 sm:py-4">
                        End Date
                      </th>
                      <th className="px-4 py-3 sm:px-6 sm:py-4">Status</th>
                      <th className="px-4 py-3 text-right sm:px-6 sm:py-4">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((c) => {
                      const days = daysUntil(c.end_date);
                      const urgency = urgencyBadge(days);
                      const st = c.status || "active";

                      return (
                        <tr
                          className="group transition-colors hover:bg-hover"
                          key={c.id}
                        >
                          <td className="px-4 py-3 sm:px-6 sm:py-4">
                            <div className="flex items-center gap-3">
                              <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary sm:flex">
                                {(c.companies?.company_name ||
                                  "?")[0].toUpperCase()}
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
                            <div className="space-y-0.5">
                              <p>
                                <span className="font-medium">
                                  {c.inflation_base_rule || "—"}
                                </span>
                                {c.max_increase_limit && (
                                  <span className="ml-1 text-xs text-text-muted">
                                    (max {c.max_increase_limit}%)
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-text-muted">
                                {c.inflation_source_name || "TCMB EVDS"}
                              </p>
                            </div>
                          </td>
                          <td className="hidden px-4 py-3 text-sm sm:table-cell sm:px-6 sm:py-4">
                            {c.end_date || "—"}
                          </td>
                          <td className="px-4 py-3 sm:px-6 sm:py-4">
                            <div className="flex flex-col items-start gap-1">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge(st)}`}
                              >
                                {STATUS_MAP[st]?.label || st}
                              </span>
                              {urgency && (
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${urgency.cls}`}
                                >
                                  {urgency.text}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right sm:px-6 sm:py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() =>
                                  navigate(`/renewal-review/${c.id}`)
                                }
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

            <div className="space-y-3 xl:sticky xl:top-4 xl:self-start">
              <ContractExpiryCalendar
                events={calendarEvents}
                selectedDay={calendarSelectedDay}
                onDaySelect={setCalendarSelectedDay}
                compact
              />
              <p className="text-xs leading-relaxed text-text-muted">
                Dots show contract end dates after your status, rule, and
                search filters. Choose a day or use the date range above to
                narrow the table.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── CONTRACT DOCUMENT PREVIEW ─── */
function ContractDocumentPreview({
  contractType,
  companyName,
  liveNewPrice,
  editEndDate,
  amount,
  liveAdjustment,
  liveDifference,
  editRule,
  inflationSourceName,
  inflationSourceInstitution,
  inflationSourceMethod,
  contractId,
  formatCurrency,
}) {
  const sigBlank = "____________________";
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const endDateText = editEndDate || "the current contract end date";
  const renewalTerms = `Renewal pricing is calculated using the ${editRule} rule with an applied adjustment of ${liveAdjustment.toFixed(1)}%. The previous contract value was ${formatCurrency(amount)}, the renewal difference is ${formatCurrency(liveDifference)}, and the renewed contract value is ${formatCurrency(liveNewPrice)}.`;
  const sourceDisclosure = `Inflation data source used for this contract: ${inflationSourceName || "TCMB EVDS"} (${inflationSourceInstitution || "Central Bank of the Republic of Turkiye (TCMB)"}), via ${inflationSourceMethod || "Official EVDS API"}.`;
  const standardServices =
    "Recurring operational service, account support, reporting, renewal administration, and related assistance reasonably required for the contract period.";
  const maintenanceServices =
    "Preventive maintenance, corrective support, response coordination, documentation, and renewal administration for the covered equipment or service area.";
  const supplyScope =
    "Supply, delivery coordination, account support, renewal administration, and related goods or services agreed between the Parties for the contract period.";

  const Title = ({ children }) => (
    <p className="mb-1 text-center text-[13px] font-bold uppercase tracking-wide text-gray-900">
      {children}
    </p>
  );
  const ThickHR = () => (
    <hr className="mb-3 border-gray-800" style={{ borderTopWidth: "1px" }} />
  );
  const ThinHR = () => (
    <hr className="my-3 border-gray-400" style={{ borderTopWidth: "0.5px" }} />
  );
  const Section = ({ children }) => (
    <p className="mb-0.5 mt-3 text-[9.5px] font-bold text-gray-900">
      {children}
    </p>
  );
  const Body = ({ children }) => (
    <p className="mb-1 text-justify text-[9px] leading-[1.5] text-gray-800">
      {children}
    </p>
  );
  const Indent = ({ children }) => (
    <p className="mb-0.5 ml-5 text-[9px] leading-[1.4] text-gray-800">
      {children}
    </p>
  );
  const DblIndent = ({ children }) => (
    <p className="mb-0.5 ml-10 text-[9px] leading-[1.4] text-gray-800">
      {children}
    </p>
  );
  const CB = () => <span className="font-mono text-[9px]">[ ]</span>;

  if (contractType === "lease_agreement") {
    return (
      <>
        <Title>LEASE AGREEMENT</Title>
        <ThickHR />
        <Body>
          <strong>I. The Parties.</strong> This Lease Agreement ("Agreement")
          made {today}, is by and between:
        </Body>
        <Indent>
          <u>Landlord:</u> RateGuard, with a mailing address of Istanbul,
          Turkey{" "}
          ("Landlord"), and
        </Indent>
        <Indent>
          <u>Tenant:</u> {companyName}, with a mailing address as per company
          records{" "}
          ("Tenant").
        </Indent>
        <Body>
          Landlord and Tenant are each referred to herein as a "Party" and,
          collectively, as the "Parties."
        </Body>
        <Body>
          NOW, THEREFORE, FOR AND IN CONSIDERATION of the mutual promises and
          agreements contained herein, the Landlord agrees to lease the Property
          to the Tenant under the following terms and conditions:
        </Body>

        <Section>II. Leased Property.</Section>
        <Body>
          The address of the leased property is: As agreed in writing between
          the Parties and recorded in the applicable company records.
        </Body>
        <Body>Hereinafter known as the "Property".</Body>

        <Section>III. Term.</Section>
        <Body>
          This Agreement shall commence on {today}, and terminate: (check one)
        </Body>
        <Indent>
          <CB /> - Fixed Term. On {endDateText}.
        </Indent>
        <Indent>
          <CB /> - Month-to-Month. Written notice of at least thirty (30) days.
        </Indent>
        <Indent>
          <CB /> - Other: Not applicable.
        </Indent>

        <Section>IV. Rent.</Section>
        <Body>
          The Tenant agrees to pay the Landlord the following rent: (check one)
        </Body>
        <Indent>
          <CB /> - {formatCurrency(liveNewPrice)} / Month
        </Indent>
        <Indent>
          <CB /> - Annual rent is not selected for this renewal.
        </Indent>
        <Indent>
          <CB /> - Other: Not applicable.
        </Indent>
        <Body>Hereinafter known as the "Rent".</Body>

        <Section>V. Payment Method.</Section>
        <Body>The Rent shall be paid as follows: (check one)</Body>
        <Indent>
          <CB /> - On the first business day of each month
        </Indent>
        <Indent>
          <CB /> - Bank transfer / wire
        </Indent>
        <Indent>
          <CB /> - Cash
        </Indent>
        <Indent>
          <CB /> - Other: Not applicable.
        </Indent>

        <Section>VI. Security Deposit.</Section>
        <Body>This Agreement requires: (check one)</Body>
        <Indent>
          <CB /> - A Security Deposit. Tenant agrees to pay the mutually agreed
          deposit amount as a security deposit.
        </Indent>
        <DblIndent>
          <CB /> - Deposit is refundable.
        </DblIndent>
        <DblIndent>
          <CB /> - Deposit is non-refundable.
        </DblIndent>
        <Indent>
          <CB /> - No Security Deposit required.
        </Indent>

        <Section>VII. Use of Property.</Section>
        <Body>
          Tenant shall use the Property solely for residential/commercial
          purposes and shall maintain the Property in good condition. Tenant
          shall not make any alterations or modifications to the Property
          without the prior written consent of the Landlord.
        </Body>

        <Section>VIII. Maintenance and Repairs.</Section>
        <Body>
          Routine maintenance and minor repairs are the responsibility of the
          Tenant; major structural repairs are the responsibility of the
          Landlord. The maximum repair cost borne by the Tenant shall not
          exceed the written amount mutually approved by the Parties per
          occurrence.
        </Body>

        <Section>IX. Termination.</Section>
        <Body>
          This Agreement may be terminated by either Party upon written notice
          of at least thirty (30) days. In the event of Tenant default, the
          Landlord may pursue legal eviction proceedings.
        </Body>

        <Section>X. Confidentiality.</Section>
        <Body>
          Both Parties agree to keep the terms of this Agreement and any
          proprietary business information confidential and shall not disclose
          such information to third parties.
        </Body>

        <Section>XI. Governing Law.</Section>
        <Body>
          This Agreement shall be governed by and construed in accordance with
          the laws of the Republic of Turkey.
        </Body>

        <Section>XII. Additional Terms &amp; Conditions.</Section>
        <Body>{renewalTerms}</Body>
        <Body>{sourceDisclosure}</Body>
        <Body>
          All prior commercial terms remain in effect unless expressly modified
          by this renewal document.
        </Body>
        <Body>
          Any service, billing, or operational changes must be confirmed in
          writing by both Parties.
        </Body>

        <Section>XIII. Entire Agreement.</Section>
        <Body>
          This Agreement constitutes the entire agreement between the Parties
          and supersedes all prior agreements, representations, and
          understandings. No amendment shall be binding unless executed in
          writing by both Parties.
        </Body>

        <ThinHR />
        <p className="mb-2 text-[9px] text-gray-800">
          <strong>Landlord's Signature</strong> {sigBlank}
          &nbsp;&nbsp;&nbsp;Date {today}
        </p>
        <p className="mb-4 text-[9px] text-gray-800">Print Name RateGuard</p>
        <p className="mb-2 text-[9px] text-gray-800">
          <strong>Tenant's Signature</strong> {sigBlank}
          &nbsp;&nbsp;&nbsp;Date {today}
        </p>
        <p className="text-[9px] text-gray-800">Print Name {companyName}</p>
      </>
    );
  }

  if (contractType === "maintenance_agreement") {
    return (
      <>
        <Title>MAINTENANCE AGREEMENT</Title>
        <ThickHR />
        <Body>
          <strong>I. The Parties.</strong> This Maintenance Agreement
          ("Agreement") made {today}, is by and between:
        </Body>
        <Indent>
          <u>Service Provider:</u> RateGuard, with a mailing address of
          Istanbul, Turkey{" "}
          ("Service Provider"), and
        </Indent>
        <Indent>
          <u>Client:</u> {companyName}, with a mailing address as per company
          records{" "}
          ("Client").
        </Indent>
        <Body>
          Service Provider and Client are each referred to herein as a "Party"
          and, collectively, as the "Parties."
        </Body>
        <Body>
          NOW, THEREFORE, FOR AND IN CONSIDERATION of the mutual promises and
          agreements contained herein, the Client hires the Service Provider to
          perform maintenance services under the following terms and conditions:
        </Body>

        <Section>II. Term.</Section>
        <Body>
          This Agreement shall commence on {today}, and terminate: (check one)
        </Body>
        <Indent>
          <CB /> - At-Will. Written notice of at least thirty (30) days.
        </Indent>
        <Indent>
          <CB /> - End Date. On {endDateText}.
        </Indent>
        <Indent>
          <CB /> - Other: Not applicable.
        </Indent>

        <Section>III. Maintenance Services.</Section>
        <Body>
          The Service Provider agrees to perform the following maintenance
          services:
        </Body>
        <Body>{maintenanceServices}</Body>
        <Body>{renewalTerms}</Body>
        <Body>Hereinafter known as the "Services".</Body>
        <Body>
          The Service Provider shall comply with the policies, standards, and
          regulations of the Client, including all applicable local, state, and
          federal laws, to the best of their abilities.
        </Body>

        <Section>IV. Scope of Services.</Section>
        <Body>The maintenance services shall include: (check one)</Body>
        <Indent>
          <CB /> - Scheduled / preventive maintenance
        </Indent>
        <Indent>
          <CB /> - Corrective / on-demand maintenance
        </Indent>
        <Indent>
          <CB /> - Full coverage (scheduled + corrective)
        </Indent>
        <Indent>
          <CB /> - Other: Not applicable.
        </Indent>

        <Section>V. Payment Amount.</Section>
        <Body>
          The Client agrees to pay the Service Provider the following
          compensation: (check one)
        </Body>
        <Indent>
          <CB /> - {formatCurrency(liveNewPrice)} / Month (flat fee)
        </Indent>
        <Indent>
          <CB /> - Hourly billing is not selected for this renewal.
        </Indent>
        <Indent>
          <CB /> - Per-visit billing is not selected for this renewal.
        </Indent>
        <Indent>
          <CB /> - Other: Not applicable.
        </Indent>
        <Body>Hereinafter known as the "Payment Amount".</Body>

        <Section>VI. Payment Method.</Section>
        <Body>The Client shall pay the Payment Amount: (check one)</Body>
        <Indent>
          <CB /> - When Invoiced
        </Indent>
        <Indent>
          <CB /> - Weekly
        </Indent>
        <Indent>
          <CB /> - Monthly
        </Indent>
        <Indent>
          <CB /> - Other: Not applicable.
        </Indent>

        <Section>VII. Inspection of Services.</Section>
        <Body>
          Any payment shall be subject to the Client inspecting the completed
          Services. If any Services are found to be defective or incomplete, the
          Client shall notify the Service Provider in writing, and the Service
          Provider shall promptly correct such work within a reasonable time.
        </Body>

        <Section>VIII. Parts and Materials.</Section>
        <Body>
          Parts and materials required to perform the Services shall be: (check
          one)
        </Body>
        <Indent>
          <CB /> - Supplied by the Service Provider (included in the Payment
          Amount).
        </Indent>
        <Indent>
          <CB /> - Supplied by the Client.
        </Indent>
        <Indent>
          <CB /> - Agreed upon mutually on a case-by-case basis.
        </Indent>

        <Section>IX. Confidentiality.</Section>
        <Body>
          Service Provider acknowledges and agrees that all financial records,
          client lists, and business information related to the Client are
          confidential ("Confidential Information") and shall not be disclosed
          to any third party during or after the term of this Agreement.
        </Body>

        <Section>X. Independent Contractor Status.</Section>
        <Body>
          Service Provider acknowledges that he/she/they are an independent
          contractor and not an employee, agent, partner, or joint venturer of
          the Client.
        </Body>

        <Section>XI. Governing Law.</Section>
        <Body>
          This Agreement shall be governed by and construed in accordance with
          the laws of the Republic of Turkey.
        </Body>

        <Section>XII. Additional Terms &amp; Conditions.</Section>
        <Body>{renewalTerms}</Body>
        <Body>{sourceDisclosure}</Body>
        <Body>
          All operational terms not modified here remain governed by the
          original agreement and applicable service records.
        </Body>

        <Section>XIII. Entire Agreement.</Section>
        <Body>
          This Agreement constitutes the entire agreement between the Parties
          and supersedes all prior agreements. No amendment shall be binding
          unless executed in writing by both Parties.
        </Body>

        <ThinHR />
        <p className="mb-2 text-[9px] text-gray-800">
          <strong>Client's Signature</strong> {sigBlank}
          &nbsp;&nbsp;&nbsp;Date {today}
        </p>
        <p className="mb-4 text-[9px] text-gray-800">Print Name {companyName}</p>
        <p className="mb-2 text-[9px] text-gray-800">
          <strong>Service Provider's Signature</strong> {sigBlank}
          &nbsp;&nbsp;&nbsp;Date {today}
        </p>
        <p className="text-[9px] text-gray-800">Print Name RateGuard</p>
      </>
    );
  }

  if (contractType === "supply_agreement") {
    return (
      <>
        <Title>SUPPLY AGREEMENT</Title>
        <ThickHR />
        <Body>
          <strong>I. The Parties.</strong> This Supply Agreement ("Agreement")
          made {today}, is by and between:
        </Body>
        <Indent>
          <u>Supplier:</u> RateGuard, with a mailing address of Istanbul,
          Turkey{" "}
          ("Supplier"), and
        </Indent>
        <Indent>
          <u>Buyer:</u> {companyName}, with a mailing address as per company
          records{" "}
          ("Buyer").
        </Indent>
        <Body>
          Supplier and Buyer are each referred to herein as a "Party" and,
          collectively, as the "Parties."
        </Body>
        <Body>
          NOW, THEREFORE, FOR AND IN CONSIDERATION of the mutual promises and
          agreements contained herein, the Buyer engages the Supplier to provide
          goods and/or services under the following terms and conditions:
        </Body>

        <Section>II. Term.</Section>
        <Body>
          This Agreement shall commence on {today}, and terminate: (check one)
        </Body>
        <Indent>
          <CB /> - At-Will. Written notice of at least thirty (30) days.
        </Indent>
        <Indent>
          <CB /> - End Date. On {endDateText}.
        </Indent>
        <Indent>
          <CB /> - Other: Not applicable.
        </Indent>

        <Section>III. Scope of Supply.</Section>
        <Body>
          The Supplier agrees to supply the following goods and/or services:
        </Body>
        <Body>{supplyScope}</Body>
        <Body>{renewalTerms}</Body>
        <Body>Hereinafter known as the "Supply".</Body>
        <Body>
          The Supplier shall, while providing the Supply, comply with the
          policies, standards, and regulations of the Buyer, including all
          applicable local, state, and federal laws.
        </Body>

        <Section>IV. Price.</Section>
        <Body>
          The Buyer agrees to pay the Supplier the following: (check one)
        </Body>
        <Indent>
          <CB /> - Lump Sum: {formatCurrency(liveNewPrice)} for the entire
          Supply
        </Indent>
        <Indent>
          <CB /> - Unit price is governed by the applicable order records.
        </Indent>
        <Indent>
          <CB /> - Other: Not applicable.
        </Indent>
        <Body>Hereinafter known as the "Contract Price".</Body>

        <Section>V. Payment Terms.</Section>
        <Body>
          The Buyer shall pay the Contract Price as follows: (check one)
        </Body>
        <Indent>
          <CB /> - Upfront / prior to delivery
        </Indent>
        <Indent>
          <CB /> - Upon delivery
        </Indent>
        <Indent>
          <CB /> - Within thirty (30) days of invoice date
        </Indent>
        <Indent>
          <CB /> - Other: Not applicable.
        </Indent>

        <Section>VI. Delivery.</Section>
        <Body>
          Delivery address: As agreed in writing between the Parties.
        </Body>
        <Body>Estimated delivery date: By the end of the contract term.</Body>
        <Body>Delivery method: (check one)</Body>
        <Indent>
          <CB /> - Delivered by Supplier (shipping included)
        </Indent>
        <Indent>
          <CB /> - Collected by Buyer
        </Indent>
        <Indent>
          <CB /> - Third-party carrier: Not selected.
        </Indent>

        <Section>VII. Inspection and Acceptance.</Section>
        <Body>
          The Buyer shall inspect all delivered goods within five (5) business
          days of receipt. If any goods fail to conform to the agreed
          specifications or quality standards, the Buyer shall notify the
          Supplier in writing, and the Supplier shall remedy the non-conformance
          within a reasonable time.
        </Body>

        <Section>VIII. Warranty.</Section>
        <Body>The Supplier offers the following warranty: (check one)</Body>
        <Indent>
          <CB /> - Twelve (12)-month warranty from date of delivery
        </Indent>
        <Indent>
          <CB /> - Manufacturer's warranty applies
        </Indent>
        <Indent>
          <CB /> - No warranty provided
        </Indent>
        <Indent>
          <CB /> - Other: Not applicable.
        </Indent>

        <Section>IX. Confidentiality.</Section>
        <Body>
          Both Parties agree to keep all trade secrets and confidential business
          information ("Confidential Information") learned under this Agreement
          strictly confidential and shall not disclose such information to any
          third party, both during and after the term of this Agreement.
        </Body>

        <Section>X. Force Majeure.</Section>
        <Body>
          Neither Party shall be liable for delays or failures in performance
          resulting from causes beyond their reasonable control, including
          natural disasters, war, pandemic, or government actions. The affected
          Party shall notify the other Party in writing without delay.
        </Body>

        <Section>XI. Default.</Section>
        <Body>
          In the event of default under this Agreement, the defaulting Party
          shall reimburse the non-defaulting Party for all costs and expenses
          reasonably incurred, including attorney's fees. The prevailing Party
          in any dispute shall be entitled to recover reasonable legal costs.
        </Body>

        <Section>XII. Governing Law.</Section>
        <Body>
          This Agreement shall be governed by and construed in accordance with
          the laws of the Republic of Turkey.
        </Body>

        <Section>XIII. Additional Terms &amp; Conditions.</Section>
        <Body>{renewalTerms}</Body>
        <Body>{sourceDisclosure}</Body>
        <Body>
          All supply, delivery, warranty, and billing terms not modified here
          remain governed by the original agreement.
        </Body>

        <Section>XIV. Entire Agreement.</Section>
        <Body>
          This Agreement constitutes the entire agreement between the Parties
          and supersedes all prior agreements, representations, and
          understandings. No amendment shall be binding unless executed in
          writing by both Parties.
        </Body>

        <ThinHR />
        <p className="mb-2 text-[9px] text-gray-800">
          <strong>Buyer's Signature</strong> {sigBlank}
          &nbsp;&nbsp;&nbsp;Date {today}
        </p>
        <p className="mb-4 text-[9px] text-gray-800">Print Name {companyName}</p>
        <p className="mb-2 text-[9px] text-gray-800">
          <strong>Supplier's Signature</strong> {sigBlank}
          &nbsp;&nbsp;&nbsp;Date {today}
        </p>
        <p className="text-[9px] text-gray-800">Print Name RateGuard</p>
      </>
    );
  }

  // Default: service_contract
  return (
    <>
      <Title>SERVICE CONTRACT</Title>
      <ThickHR />
      <Body>
        <strong>I. The Parties.</strong> This Service Contract ("Agreement")
        made {today}, is by and between:
      </Body>
      <Indent>
        <u>Service Provider:</u> RateGuard, with a mailing address of Istanbul,
        Turkey{" "}
        ("Service Provider"), and
      </Indent>
      <Indent>
        <u>Client:</u> {companyName}, with a mailing address as per company
        records{" "}
        ("Client").
      </Indent>
      <Body>
        Service Provider and Client are each referred to herein as a "Party"
        and, collectively, as the "Parties."
      </Body>
      <Body>
        NOW, THEREFORE, FOR AND IN CONSIDERATION of the mutual promises and
        agreements contained herein, the Client hires the Service Provider to
        work under the terms and conditions hereby agreed upon by the Parties:
      </Body>

      <Section>II. Term.</Section>
      <Body>
        The term of this Agreement shall commence on {today}, and terminate:
        (check one)
      </Body>
      <Indent>
        <CB /> - At-Will. Written notice of at least thirty (30) days.
      </Indent>
      <Indent>
        <CB /> - End Date. On {endDateText}.
      </Indent>
      <Indent>
        <CB /> - Other: Not applicable.
      </Indent>

      <Section>III. The Service.</Section>
      <Body>The Service Provider agrees to provide the following:</Body>
      <Body>{standardServices}</Body>
      <Body>{renewalTerms}</Body>
      <Body>Hereinafter known as the "Service".</Body>
      <Body>
        The Service Provider shall, while performing the Service, comply with
        the policies, standards, and regulations of the Client, including local,
        State, and Federal laws and to the best of their abilities.
      </Body>

      <Section>IV. Payment Amount.</Section>
      <Body>
        The Client agrees to pay the Service Provider the following compensation
        for the Service performed under this Agreement: (check one)
      </Body>
      <Indent>
        <CB /> - {formatCurrency(liveNewPrice)} / Month
      </Indent>
      <Indent>
        <CB /> - Hourly billing is not selected for this renewal.
      </Indent>
      <Indent>
        <CB /> - Other: Not applicable.
      </Indent>
      <Body>Hereinafter known as the "Payment Amount".</Body>

      <Section>V. Payment Method.</Section>
      <Body>The Client shall pay the Payment Amount: (check one)</Body>
      <Indent>
        <CB /> - When Invoiced
      </Indent>
      <Indent>
        <CB /> - Daily
      </Indent>
      <Indent>
        <CB /> - Weekly
      </Indent>
      <Indent>
        <CB /> - Bi-Weekly
      </Indent>
      <Indent>
        <CB /> - Monthly
      </Indent>
      <Indent>
        <CB /> - Other: Not applicable.
      </Indent>
      <Body>
        The Payment Amount and Payment Method collectively shall be referred to
        as "Compensation".
      </Body>

      <Section>VI. Retainer.</Section>
      <Body>This Agreement requires: (check one)</Body>
      <Indent>
        <CB /> - A Retainer. Client agrees to pay the mutually agreed retainer
        amount as an advance on future Services.
      </Indent>
      <DblIndent>
        <CB /> - Retainer is refundable.
      </DblIndent>
      <DblIndent>
        <CB /> - Retainer is non-refundable.
      </DblIndent>
      <Indent>
        <CB /> - No Retainer. The Client is not required to pay a retainer
        before work commences.
      </Indent>

      <Section>VII. Inspection of Services.</Section>
      <Body>
        Any Compensation shall be subject to the Client inspecting the completed
        Services of the Service Provider. If any Services are defective or
        incomplete, the Client shall notify the Service Provider, who shall
        promptly correct such work within a reasonable time.
      </Body>

      <Section>VIII. Return of Property.</Section>
      <Body>
        Upon termination of this Agreement, all property provided by the Client,
        including but not limited to equipment, supplies, and uniforms, must be
        returned by the Service Provider. Failure to do so may result in a delay
        in any final payment.
      </Body>

      <Section>IX. Time is of the Essence.</Section>
      <Body>
        Service Provider acknowledges that time is of the essence in regard to
        the performance of all Services.
      </Body>

      <Section>X. Confidentiality.</Section>
      <Body>
        Service Provider acknowledges and agrees that all financial and
        accounting records, client and customer lists, and any other data
        related to the Client's business is confidential ("Confidential
        Information") and shall not be disclosed during or after the term of
        this Agreement without prior written consent of the Client.
      </Body>

      <Section>XI. Taxes.</Section>
      <Body>
        Service Provider shall pay and be solely responsible for all
        withholdings, including Social Security, State unemployment, State and
        Federal income taxes, and any other applicable tax obligations arising
        from the Services performed.
      </Body>

      <Section>XII. Independent Contractor Status.</Section>
      <Body>
        Service Provider acknowledges that he/she/they are an independent
        contractor and not an agent, partner, joint venturer, nor an employee of
        the Client. Service Provider shall have no authority to bind or obligate
        the Client in any manner.
      </Body>

      <Section>XIII. Safety.</Section>
      <Body>
        Service Provider shall, at their own expense, be solely responsible for
        protecting all persons from risk of death, injury, or bodily harm
        arising from the Services or the Work Site. Service Provider shall
        comply with all applicable regulations and federal law.
      </Body>

      <Section>XIV. Governing Law.</Section>
      <Body>
        This Agreement shall be governed by and construed in accordance with the
        laws of the Republic of Turkey.
      </Body>

      <Section>XV. Additional Terms &amp; Conditions.</Section>
      <Body>{renewalTerms}</Body>
      <Body>{sourceDisclosure}</Body>
      <Body>
        All original service terms remain effective unless expressly amended in
        this renewal document.
      </Body>

      <Section>XVI. Entire Agreement.</Section>
      <Body>
        This Agreement constitutes the entire agreement between the Parties and
        supersedes all prior contemporaneous agreements, representations, and
        understandings. No supplement, modification, or amendment shall be
        binding unless executed in writing by all Parties.
      </Body>

      <ThinHR />
      <p className="mb-2 text-[9px] text-gray-800">
        <strong>Client's Signature</strong> {sigBlank}
        &nbsp;&nbsp;&nbsp;Date {today}
      </p>
      <p className="mb-4 text-[9px] text-gray-800">Print Name {companyName}</p>
      <p className="mb-2 text-[9px] text-gray-800">
        <strong>Service Provider's Signature</strong> {sigBlank}
        &nbsp;&nbsp;&nbsp;Date {today}
      </p>
      <p className="text-[9px] text-gray-800">Print Name RateGuard</p>
    </>
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

  const { setActiveContractId } = useRateBot();

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

  // Set active contract context for RateBot
  useEffect(() => {
    setActiveContractId(id);
    return () => setActiveContractId(null);
  }, [id, setActiveContractId]);

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
  const maxLimitNum = editMaxLimit !== "" ? Number(editMaxLimit) : null;
  if (editRule === "CUSTOM") liveAdjustment = maxLimitNum || 0;
  else if (editRule === "TUFE") liveAdjustment = tufe;
  else if (editRule === "UFE") liveAdjustment = ufe;
  else liveAdjustment = (tufe + ufe) / 2;

  let liveCapped = false;
  if (editRule !== "CUSTOM" && maxLimitNum != null && liveAdjustment > maxLimitNum) {
    liveAdjustment = maxLimitNum;
    liveCapped = true;
  }

  const liveNewPrice = amount * (1 + liveAdjustment / 100);
  const liveDifference = liveNewPrice - amount;

  const companyName = calc?.company_name || "—";
  const inflationSourceName =
    calc?.inflation_source_name || contract?.inflation_source_name || "TCMB EVDS";
  const inflationSourceInstitution =
    calc?.inflation_source_institution ||
    contract?.inflation_source_institution ||
    "Central Bank of the Republic of Turkiye (TCMB)";
  const inflationSourceMethod =
    calc?.inflation_source_method ||
    contract?.inflation_source_method ||
    "Official EVDS API";
  const inflationDataSource =
    calc?.inflation_data_source || contract?.inflation_data_source || "tcmb_evds";

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
        max_increase_limit: maxLimitNum,
        inflation_data_source: inflationDataSource,
        inflation_source_name: inflationSourceName,
        inflation_source_institution: inflationSourceInstitution,
        inflation_source_method: inflationSourceMethod,
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
        inflation_data_source: inflationDataSource,
        inflation_source_name: inflationSourceName,
        inflation_source_institution: inflationSourceInstitution,
        inflation_source_method: inflationSourceMethod,
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
        inflation_base_rule: editRule,
        max_increase_limit: maxLimitNum,
        inflation_data_source: inflationDataSource,
        inflation_source_name: inflationSourceName,
        inflation_source_institution: inflationSourceInstitution,
        inflation_source_method: inflationSourceMethod,
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
        inflation_base_rule: editRule,
        max_increase_limit: maxLimitNum,
        inflation_data_source: inflationDataSource,
        inflation_source_name: inflationSourceName,
        inflation_source_institution: inflationSourceInstitution,
        inflation_source_method: inflationSourceMethod,
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
              <span className="font-semibold">
                {formatCurrency(amount, contract?.currency)}
              </span>
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
              <p className="text-sm font-semibold truncate">
                {emailSubject || "Default Notification"}
              </p>
              <p className="text-xs text-text-muted truncate mt-1">
                {emailBody
                  ? "Custom email body will be included."
                  : "Default email template will be used."}
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
              {companyName}{" "}
              {contract.contract_type === "lease_agreement"
                ? "Lease Agreement"
                : contract.contract_type === "maintenance_agreement"
                  ? "Maintenance Agreement"
                  : contract.contract_type === "supply_agreement"
                    ? "Supply Agreement"
                    : "Service Contract"}
            </h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-text-muted">
              <span className="material-symbols-outlined text-base">timer</span>
              End date: {editEndDate || "—"} &bull; ID:{" "}
              {contract.id.slice(0, 8)}
            </p>
          </div>

          {/* Stats Row */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:mb-8 md:grid-cols-4">
            <div className="flex min-h-[9.5rem] flex-col justify-center rounded-xl border border-border bg-surface p-4 sm:p-5">
              <p className="text-xs font-medium text-text-muted sm:text-sm">
                Current Contract Value
              </p>
              <p className="mt-3 text-xl font-bold leading-tight sm:text-3xl">
                {formatCurrency(amount)}
              </p>
            </div>
            <div className="flex min-h-[9.5rem] flex-col justify-center rounded-xl border border-border bg-surface p-4 sm:p-5">
              <p className="text-xs font-medium text-text-muted sm:text-sm">
                Inflation Adjustment ({editRule})
              </p>
              <p className="mt-3 text-xl font-bold leading-tight text-amber-500 sm:text-3xl">
                +{liveAdjustment.toFixed(1)}%
              </p>
              {liveCapped && (
                <p className="mt-1 text-xs font-medium text-red-500">
                  Max limit applied
                </p>
              )}
            </div>
            <div className="flex min-h-[9.5rem] flex-col justify-center rounded-xl border border-border bg-surface p-4 sm:p-5">
              <p className="text-xs font-medium text-text-muted sm:text-sm">
                Price Difference
              </p>
              <p className="mt-3 text-xl font-bold leading-tight text-amber-500 sm:text-3xl">
                +{formatCurrency(liveDifference)}
              </p>
            </div>
            <div className="flex min-h-[9.5rem] flex-col justify-center rounded-xl border border-primary/20 bg-primary-soft p-4 sm:p-5">
              <p className="text-xs font-bold text-primary sm:text-sm">
                Calculated New Price
              </p>
              <p className="mt-3 text-2xl font-black leading-tight text-primary sm:text-4xl">
                {formatCurrency(liveNewPrice)}
              </p>
              {liveAdjustment > 60 && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-600">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  <p className="mt-0.5 text-[11px] font-semibold leading-snug">
                    Excessive increase ({liveAdjustment.toFixed(1)}%). Review before sending.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 gap-6 sm:gap-8 xl:grid-cols-12">
            {/* ── Left Column ── */}
            <div className="space-y-6 sm:space-y-8 xl:col-span-7">
              {/* Client Decision Panel - visible to client/user and admins when pending */}
              {["client", "user", "super_admin", "company_admin"].includes(
                user?.role,
              ) &&
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
                          {["super_admin", "company_admin"].includes(user?.role)
                            ? "Approve on Behalf of Client"
                            : "Contract Awaiting Your Decision"}
                        </h3>
                        <p className="text-sm text-text-muted">
                          {["super_admin", "company_admin"].includes(user?.role)
                            ? `Approving as admin on behalf of ${companyName}.`
                            : "Please review the terms and accept or reject."}
                        </p>
                      </div>
                    </div>
                    {["super_admin", "company_admin"].includes(user?.role) && (
                      <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600">
                        <span className="material-symbols-outlined text-[16px]">
                          admin_panel_settings
                        </span>
                        You are acting as an administrator. This action will be
                        recorded in the audit log.
                      </div>
                    )}
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
              {!["client", "user"].includes(user?.role) &&
                (() => {
                  const isSalesReadonly = user?.role === "sales";
                  return (
                    <section className="overflow-hidden rounded-xl border border-border bg-surface">
                      <div className="flex items-center justify-between border-b border-border bg-surface-alt px-4 py-3 sm:px-6 sm:py-4">
                        <h3 className="text-lg font-bold">Calculation Logic</h3>
                        {isSalesReadonly ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-text-muted">
                            <span className="material-symbols-outlined text-[14px]">
                              lock
                            </span>
                            Read-only for Sales
                          </span>
                        ) : (
                          dirty && (
                            <span className="text-xs font-medium text-amber-500">
                              Unsaved changes
                            </span>
                          )
                        )}
                      </div>
                      <div className="space-y-5 p-4 text-sm sm:p-6">
                        <div className="grid grid-cols-[minmax(0,1fr)_200px] items-center gap-4">
                          <span className="text-text-muted">
                            Base Rate (TRY)
                          </span>
                          <input
                            type="number"
                            className={`w-full text-right ${inputCls} ${isSalesReadonly ? "cursor-not-allowed opacity-70" : ""}`}
                            value={editAmount}
                            readOnly={isSalesReadonly}
                            onChange={
                              isSalesReadonly
                                ? undefined
                                : handleFieldChange(setEditAmount)
                            }
                          />
                        </div>
                        <div className="grid grid-cols-[minmax(0,1fr)_200px] items-center gap-4">
                          <span className="text-text-muted">End Date</span>
                          <input
                            type="date"
                            className={`w-full ${inputCls} ${isSalesReadonly ? "cursor-not-allowed opacity-70" : ""}`}
                            value={editEndDate}
                            readOnly={isSalesReadonly}
                            onChange={
                              isSalesReadonly
                                ? undefined
                                : handleFieldChange(setEditEndDate)
                            }
                          />
                        </div>
                        <div className="grid grid-cols-[minmax(0,1fr)_200px] items-center gap-4">
                          <span className="text-text-muted">
                            Inflation Rule
                          </span>
                          <select
                            className={`w-full ${inputCls} ${isSalesReadonly ? "cursor-not-allowed opacity-70" : ""}`}
                            value={editRule}
                            disabled={isSalesReadonly}
                            onChange={
                              isSalesReadonly
                                ? undefined
                                : handleFieldChange(setEditRule)
                            }
                          >
                            <option value="TUFE">TUFE</option>
                            <option value="UFE">UFE</option>
                            <option value="TUFE+UFE">TUFE + UFE (Avg)</option>
                            <option value="CUSTOM">Custom</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-[minmax(0,1fr)_200px] items-center gap-4">
                          <span className="text-text-muted">
                            Max Increase Limit (%)
                          </span>
                          <input
                            type="number"
                            className={`w-full text-right ${inputCls} ${isSalesReadonly ? "cursor-not-allowed opacity-70" : ""}`}
                            placeholder="No limit"
                            value={editMaxLimit}
                            readOnly={isSalesReadonly}
                            onChange={
                              isSalesReadonly
                                ? undefined
                                : handleFieldChange(setEditMaxLimit)
                            }
                          />
                        </div>
                        <div className="grid grid-cols-[minmax(0,1fr)_200px] items-start gap-4">
                          <span className="text-text-muted">Data Source</span>
                          <div className="rounded-md border border-border bg-surface-alt px-3 py-2 text-right">
                            <p className="text-sm font-semibold text-text">
                              {inflationSourceName}
                            </p>
                            <p className="mt-1 text-[11px] leading-snug text-text-muted">
                              {inflationSourceInstitution} · {inflationSourceMethod}
                            </p>
                          </div>
                        </div>
                        <div className="h-px bg-border" />
                        <div className="flex justify-between py-1">
                          <span
                            className="text-text-muted"
                            title="Consumer Price Index (TCMB)"
                          >
                            TUFE (CPI)
                          </span>
                          <span className="font-medium">
                            +{tufe.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span
                            className="text-text-muted"
                            title="Producer Price Index (TCMB)"
                          >
                            UFE (PPI)
                          </span>
                          <span className="font-medium">
                            +{ufe.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span
                            className="text-text-muted"
                            title="TCMB Official Exchange Rate"
                          >
                            USD/TRY
                          </span>
                          <span className="font-medium">
                            {calc.usd_rate.toFixed(4)}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span
                            className="text-text-muted"
                            title="TCMB Official Exchange Rate"
                          >
                            EUR/TRY
                          </span>
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
                  );
                })()}

              {/* Addendum Preview */}
              <section className="rounded-xl border border-border bg-surface">
                <div className="flex items-center justify-between border-b border-border bg-surface-alt px-4 py-3 sm:px-6 sm:py-4">
                  <div>
                    <h3 className="text-lg font-bold">Contract Preview</h3>
                    <p className="text-xs text-text-muted">
                      Template view — download addendum PDF above
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
                    <ContractDocumentPreview
                      contractType={
                        contract.contract_type || "service_contract"
                      }
                      companyName={companyName}
                      liveNewPrice={liveNewPrice}
                      editEndDate={editEndDate}
                      amount={amount}
                      liveAdjustment={liveAdjustment}
                      liveDifference={liveDifference}
                      editRule={editRule}
                      inflationSourceName={inflationSourceName}
                      inflationSourceInstitution={inflationSourceInstitution}
                      inflationSourceMethod={inflationSourceMethod}
                      contractId={contract.id}
                      formatCurrency={formatCurrency}
                    />
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

                  {/* Finance: Notify Sales (instead of send-to-client) */}
                  {user?.role === "finance" && (
                    <FinanceNotifySalesButton
                      contractId={id}
                      contract={contract}
                    />
                  )}

                  {/* Sales + Admin: Send to Client */}
                  {["company_admin", "super_admin", "sales"].includes(
                    user?.role,
                  ) && (
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

                  {/* Finance/Admin: Save Draft (not Sales) */}
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

              {/* AI Email Composer — only for Sales and Admin roles */}
              {["sales", "company_admin", "super_admin"].includes(
                user?.role,
              ) && (
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
              )}

              {/* Finance: Internal Notes reminder */}
              {user?.role === "finance" && (
                <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-amber-500 mt-0.5">
                      info
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-amber-600">
                        Finance Workflow
                      </p>
                      <p className="mt-1 text-xs text-text-muted leading-relaxed">
                        Once you finish preparing this contract, click{" "}
                        <strong>Notify Sales Team</strong> above. Sales will
                        handle communication with the counterparty and send the
                        contract for their review.
                      </p>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── APPROVED AGREEMENTS ─── */
function ApprovedAgreements() {
  const { error: toastError } = useToast();
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getApprovedAgreements();
      setAgreements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Approved agreements load error:", err);
      toastError("Failed to load approved agreements.");
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownloadPdf = async (contractId) => {
    setPdfLoadingId(contractId);
    try {
      await downloadApprovedPdf(contractId);
    } catch (err) {
      toastError("PDF could not be downloaded: " + err.message);
    } finally {
      setPdfLoadingId(null);
    }
  };

  const formatCurrency = (n, curr = "TRY") =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: curr || "TRY",
    }).format(n || 0);

  const CONTRACT_TYPE_LABELS = {
    service_contract: "Service Contract",
    lease_agreement: "Lease Agreement",
    maintenance_agreement: "Maintenance Agreement",
    supply_agreement: "Supply Agreement",
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return agreements;
    const q = search.toLowerCase();
    return agreements.filter(
      (a) =>
        (a.tenant_company?.company_name || "").toLowerCase().includes(q) ||
        (a.client_company?.company_name || "").toLowerCase().includes(q),
    );
  }, [agreements, search]);

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
      </div>
    );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-text">
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-4 sm:px-8 sm:py-5">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold sm:text-2xl">
            Approved Agreements
          </h2>
          <p className="mt-1 hidden text-sm text-text-muted sm:block">
            Mutually approved contracts between companies.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="material-symbols-outlined text-emerald-500 text-[18px]">
            verified
          </span>
          <span className="font-medium">
            {filtered.length} agreement{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto max-w-6xl space-y-5">
          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search by company name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text outline-none placeholder:text-text-muted focus:border-primary"
              />
            </div>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-16 text-center">
              <span className="material-symbols-outlined mb-3 text-5xl text-text-muted">
                handshake
              </span>
              <p className="text-sm font-semibold text-text">
                No approved agreements yet
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Agreements that have been mutually approved by both parties will
                appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((a) => {
                const tenantName = a.tenant_company?.company_name || "—";
                const clientName = a.client_company?.company_name || "—";
                const isExpanded = expandedId === a.id;
                const approvedDate = a.approved_at
                  ? new Date(a.approved_at).toLocaleDateString("tr-TR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—";

                return (
                  <div
                    key={a.id}
                    className="overflow-hidden rounded-xl border border-border bg-surface transition-shadow hover:shadow-md"
                  >
                    {/* Main row */}
                    <div className="flex items-center gap-4 px-5 py-4">
                      {/* Companies */}
                      <div className="flex flex-1 min-w-0 items-center gap-3 flex-wrap">
                        {/* Tenant company */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                            {tenantName[0]?.toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-text-muted uppercase tracking-wide font-semibold">
                              Service Provider
                            </p>
                            <p className="truncate text-sm font-semibold text-text">
                              {tenantName}
                            </p>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex items-center gap-1 shrink-0 px-1">
                          <span className="material-symbols-outlined text-emerald-500 text-[22px]">
                            sync_alt
                          </span>
                        </div>

                        {/* Client company */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-600">
                            {clientName[0]?.toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-text-muted uppercase tracking-wide font-semibold">
                              Client
                            </p>
                            <p className="truncate text-sm font-semibold text-text">
                              {clientName}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Meta info */}
                      <div className="hidden sm:flex items-center gap-6 shrink-0 text-sm">
                        <div className="text-center">
                          <p className="text-xs text-text-muted">Amount</p>
                          <p className="font-semibold text-text">
                            {formatCurrency(
                              a.new_amount || a.previous_amount,
                              a.currency,
                            )}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-text-muted">Approved</p>
                          <p className="font-semibold text-text">
                            {approvedDate}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-text-muted">End Date</p>
                          <p className="font-semibold text-text">
                            {a.end_date || "—"}
                          </p>
                        </div>
                      </div>

                      {/* Approved badge */}
                      <div className="shrink-0 hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                        <span className="material-symbols-outlined text-[14px]">
                          verified
                        </span>
                        Approved
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() =>
                            handleDownloadPdf(a.id)
                          }
                          disabled={pdfLoadingId === a.id}
                          className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white disabled:opacity-50"
                          title="Download PDF"
                        >
                          {pdfLoadingId === a.id ? (
                            <>
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                              <span className="hidden sm:inline">
                                Generating…
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[16px]">
                                picture_as_pdf
                              </span>
                              <span className="hidden sm:inline">PDF</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() =>
                            setExpandedId(isExpanded ? null : a.id)
                          }
                          className="flex items-center justify-center rounded-lg border border-border p-1.5 text-text-muted transition-colors hover:bg-hover hover:text-text"
                          title={isExpanded ? "Collapse" : "Show details"}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {isExpanded ? "expand_less" : "expand_more"}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-border bg-surface-alt px-5 py-4">
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                          <div>
                            <p className="text-xs text-text-muted uppercase tracking-wide font-semibold mb-1">
                              Contract Type
                            </p>
                            <p className="text-sm text-text font-medium">
                              {CONTRACT_TYPE_LABELS[a.contract_type] ||
                                a.contract_type ||
                                "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-text-muted uppercase tracking-wide font-semibold mb-1">
                              Inflation Rule
                            </p>
                            <p className="text-sm text-text font-medium">
                              {a.inflation_base_rule || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-text-muted uppercase tracking-wide font-semibold mb-1">
                              Max Increase
                            </p>
                            <p className="text-sm text-text font-medium">
                              {a.max_increase_limit != null
                                ? `${a.max_increase_limit}%`
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-text-muted uppercase tracking-wide font-semibold mb-1">
                              Applied Adjustment
                            </p>
                            <p className="text-sm text-text font-medium">
                              {a.applied_adjustment != null
                                ? `${a.applied_adjustment}%`
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-text-muted uppercase tracking-wide font-semibold mb-1">
                              Previous Amount
                            </p>
                            <p className="text-sm text-text font-medium">
                              {formatCurrency(a.previous_amount, a.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-text-muted uppercase tracking-wide font-semibold mb-1">
                              New Amount
                            </p>
                            <p className="text-sm font-bold text-emerald-600">
                              {formatCurrency(a.new_amount, a.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-text-muted uppercase tracking-wide font-semibold mb-1">
                              Currency
                            </p>
                            <p className="text-sm text-text font-medium">
                              {a.currency || "TRY"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-text-muted uppercase tracking-wide font-semibold mb-1">
                              Contract ID
                            </p>
                            <p className="text-xs text-text-muted font-mono">
                              {a.id.slice(0, 18)}…
                            </p>
                          </div>
                        </div>

                        {/* Mobile meta */}
                        <div className="mt-4 flex flex-wrap gap-4 sm:hidden text-sm">
                          <div>
                            <p className="text-xs text-text-muted">
                              Approved On
                            </p>
                            <p className="font-semibold">{approvedDate}</p>
                          </div>
                          <div>
                            <p className="text-xs text-text-muted">End Date</p>
                            <p className="font-semibold">{a.end_date || "—"}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() =>
                              handleDownloadPdf(a.id)
                            }
                            disabled={pdfLoadingId === a.id}
                            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                          >
                            {pdfLoadingId === a.id ? (
                              <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                Generating PDF…
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-[18px]">
                                  picture_as_pdf
                                </span>
                                Download Full Contract PDF
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ContractReviewPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("renewals");

  // If viewing a specific contract detail, skip tabs entirely
  if (id) return <ContractDetail />;

  return (
    <ContractReviewTabs activeTab={activeTab} setActiveTab={setActiveTab} />
  );
}

function ContractReviewTabs({ activeTab, setActiveTab }) {
  const { user } = useAuth();

  // Only company_admin (and super_admin) see the Approved Agreements tab
  const showAgreementsTab =
    user?.role === "company_admin" || user?.role === "super_admin";

  if (!showAgreementsTab) return <ContractList />;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-text">
      {/* Tab bar */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-surface px-4 sm:px-8">
        <button
          onClick={() => setActiveTab("renewals")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "renewals"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            description
          </span>
          Renewal Review
        </button>
        <button
          onClick={() => setActiveTab("agreements")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "agreements"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            handshake
          </span>
          Approved Agreements
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "renewals" ? <ContractList /> : <ApprovedAgreements />}
      </div>
    </div>
  );
}
