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

// ── Financial Logs ─────────────────────────────────────────
export const getFinancialLogs = (limit = 50) =>
  request(`/financial-logs?limit=${limit}`);

export const createFinancialLog = (data) =>
  request("/financial-logs", { method: "POST", body: JSON.stringify(data) });

export const deleteFinancialLog = (id) =>
  request(`/financial-logs/${id}`, { method: "DELETE" });

// ── Market Data & Dashboard ────────────────────────────────
export const getMarketData = () => request("/market-data");

export const saveMarketData = () =>
  request("/market-data/save", { method: "POST" });

export const getDashboardStats = () => request("/dashboard/stats");
