const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Companies ──────────────────────────────────────────────
export const getCompanies = (search = "") =>
  request(`/companies${search ? `?search=${encodeURIComponent(search)}` : ""}`);

export const getCompany = (id) => request(`/companies/${id}`);

export const createCompany = (data) =>
  request("/companies", { method: "POST", body: JSON.stringify(data) });

export const updateCompany = (id, data) =>
  request(`/companies/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteCompany = (id) =>
  request(`/companies/${id}`, { method: "DELETE" });

// ── Contracts ──────────────────────────────────────────────
export const getContracts = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/contracts${qs ? `?${qs}` : ""}`);
};

export const getContract = (id) => request(`/contracts/${id}`);

export const createContract = (data) =>
  request("/contracts", { method: "POST", body: JSON.stringify(data) });

export const updateContract = (id, data) =>
  request(`/contracts/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteContract = (id) =>
  request(`/contracts/${id}`, { method: "DELETE" });

export const saveDraft = (id, data) =>
  request(`/contracts/${id}/save-draft`, { method: "POST", body: JSON.stringify(data) });

export const rejectContract = (id, notes = "") =>
  request(`/contracts/${id}/reject`, { method: "POST", body: JSON.stringify({ rejection_notes: notes }) });

export const approveContract = (id, data) =>
  request(`/contracts/${id}/approve`, { method: "POST", body: JSON.stringify(data) });

// ── Financial Logs ─────────────────────────────────────────
export const getFinancialLogs = (limit = 50) =>
  request(`/financial-logs?limit=${limit}`);

export const createFinancialLog = (data) =>
  request("/financial-logs", { method: "POST", body: JSON.stringify(data) });

export const deleteFinancialLog = (id) =>
  request(`/financial-logs/${id}`, { method: "DELETE" });

// ── Calculations & PDF ──────────────────────────────────────
export const getCalculation = (contractId) =>
  request(`/contracts/${contractId}/calculate`);

export const downloadPdf = async (contractId) => {
  const res = await fetch(`${BASE}/contracts/${contractId}/pdf`);
  if (!res.ok) throw new Error(`PDF download failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    res.headers.get("content-disposition")?.split("filename=")[1]?.replace(/"/g, "") ||
    `addendum_${contractId.slice(0, 8)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ── Market Data & Dashboard ────────────────────────────────
export const getMarketData = () => request("/market-data");

export const getMarketHistory = (period = 90) =>
  request(`/market-data/history?period=${period}`);

export const saveMarketData = () =>
  request("/market-data/save", { method: "POST" });

export const getDashboardStats = () => request("/dashboard/stats");
