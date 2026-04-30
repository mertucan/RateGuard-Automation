const BASE = "/api";

function getAuthHeaders() {
  try {
    const user = JSON.parse(localStorage.getItem("rg_user") || "null");
    if (user?.id) return { "X-User-Id": user.id };
  } catch {
    /* ignore */
  }
  return {};
}

function parseFilenameFromContentDisposition(header) {
  if (!header || typeof header !== "string") return null;
  const star = header.match(/filename\*=(?:UTF-8'')?([^;\n]+)/i);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"+|"+$/g, ""));
    } catch {
      return star[1].trim().replace(/^"+|"+$/g, "");
    }
  }
  const q = header.match(/filename="([^"]+)"/i);
  if (q) return q[1];
  const u = header.match(/filename=([^;\s]+)/i);
  return u ? u[1].replace(/^"+|"+$/g, "") : null;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const json = JSON.parse(text);
      message = json.error || json.message || json.detail || text;
    } catch {
      // plain text error
    }
    throw new Error(message || `Request failed (${res.status})`);
  }
  return res.json();
}

// ── Auth ───────────────────────────────────────────────────
export const loginUser = (data) =>
  request("/auth/login", { method: "POST", body: JSON.stringify(data) });

export const registerUser = (data) =>
  request("/auth/register", { method: "POST", body: JSON.stringify(data) });

export const forgotPassword = (email) =>
  request("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const resetPassword = (data) =>
  request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ── Companies ──────────────────────────────────────────────
export const getCompanies = (search = "", includeAll = false) => {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (includeAll) params.set("include_all", "true");
  const qs = params.toString();
  return request(`/companies${qs ? `?${qs}` : ""}`);
};

export const getContractCounterparties = (search = "") =>
  request(
    `/companies/contract-counterparties${search ? `?search=${encodeURIComponent(search)}` : ""}`,
  );

export const getAddClientCandidates = (tenantCompanyId = "") => {
  const qs = tenantCompanyId
    ? `?tenant_company_id=${encodeURIComponent(tenantCompanyId)}`
    : "";
  return request(`/companies/add-client-candidates${qs}`);
};

export const getCompaniesAvailableToLink = (search = "") =>
  request(
    `/companies/available-to-link${search ? `?search=${encodeURIComponent(search)}` : ""}`,
  );

export const linkCompanyToTenant = (companyId, data = {}) =>
  request(`/companies/${companyId}/link-tenant`, {
    method: "POST",
    body: JSON.stringify(data),
  });

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
  request(`/contracts/${id}/save-draft`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const rejectContract = (id, notes = "") =>
  request(`/contracts/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ rejection_notes: notes }),
  });

export const approveContract = (id, data) =>
  request(`/contracts/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const sendContractToClient = (id, data = {}) =>
  request(`/contracts/${id}/send-to-client`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const clientApproveContract = (id) =>
  request(`/contracts/${id}/client-approve`, {
    method: "POST",
    body: JSON.stringify({}),
  });

export const clientRejectContract = (id, reason) =>
  request(`/contracts/${id}/client-reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

// ── Financial Logs ─────────────────────────────────────────
export const getFinancialLogs = (limit = 50) =>
  request(`/financial-logs?limit=${limit}`);

export const createFinancialLog = (data) =>
  request("/financial-logs", { method: "POST", body: JSON.stringify(data) });

export const deleteFinancialLog = (id) =>
  request(`/financial-logs/${id}`, { method: "DELETE" });

// ── Calculations, PDF & AI Email ─────────────────────────────
export const getCalculation = (contractId) =>
  request(`/contracts/${contractId}/calculate`);

export const generateEmailDraft = (contractId, data = {}) =>
  request(`/contracts/${contractId}/generate-email`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const downloadPdf = async (contractId) => {
  const res = await fetch(`${BASE}/contracts/${contractId}/pdf`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`PDF download failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const fromHeader = parseFilenameFromContentDisposition(
    res.headers.get("content-disposition"),
  );
  a.download = fromHeader || `RG_Addendum_${contractId.replace(/-/g, "").slice(0, 8).toUpperCase()}.pdf`;
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

export const getDashboardStats = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return request(`/dashboard/stats${q ? `?${q}` : ""}`);
};

// ── Users ─────────────────────────────────────────────────
export const getUsers = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/users${qs ? `?${qs}` : ""}`);
};

export const getUser = (id) => request(`/users/${id}`);

export const createUser = (data) =>
  request("/users", { method: "POST", body: JSON.stringify(data) });

export const updateUser = (id, data) =>
  request(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteUser = (id) => request(`/users/${id}`, { method: "DELETE" });

// ── Notifications ─────────────────────────────────────────
export const getNotifications = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/notifications${qs ? `?${qs}` : ""}`);
};

export const createNotification = (data) =>
  request("/notifications", { method: "POST", body: JSON.stringify(data) });

export const markNotificationRead = (id) =>
  request(`/notifications/${id}/read`, { method: "POST" });

export const markAllNotificationsRead = () =>
  request("/notifications/read-all", { method: "POST" });

export const deleteNotification = (id) =>
  request(`/notifications/${id}`, { method: "DELETE" });

export const checkExpiringContracts = () =>
  request("/notifications/check-expiring", { method: "POST" });

// ── Communications / Chat ────────────────────────────────
export const getCommunications = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/communications${qs ? `?${qs}` : ""}`);
};

export const createCommunication = (data) =>
  request("/communications", { method: "POST", body: JSON.stringify(data) });

export const deleteCommunication = (id) =>
  request(`/communications/${id}`, { method: "DELETE" });

export const getContractMessages = (contractId) =>
  request(`/contracts/${contractId}/messages`);

export const sendContractMessage = (contractId, data) =>
  request(`/contracts/${contractId}/messages`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const analyzeContractTone = (contractId) =>
  request(`/contracts/${contractId}/analyze-tone`, { method: "POST" });

// ── Renewals ──────────────────────────────────────────────
export const getRenewals = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/renewals${qs ? `?${qs}` : ""}`);
};

export const createRenewal = (data) =>
  request("/renewals", { method: "POST", body: JSON.stringify(data) });

export const updateRenewal = (id, data) =>
  request(`/renewals/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteRenewal = (id) =>
  request(`/renewals/${id}`, { method: "DELETE" });

// ── Audit Logs ────────────────────────────────────────────
export const getAuditLogs = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/audit-logs${qs ? `?${qs}` : ""}`);
};

// ── Applications ──────────────────────────────────────────
export const getApplications = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/applications${qs ? `?${qs}` : ""}`);
};

export const createApplication = (data) =>
  request("/applications", { method: "POST", body: JSON.stringify(data) });

export const reviewApplication = (id, data) =>
  request(`/applications/${id}`, { method: "PUT", body: JSON.stringify(data) });

// ── Contract: notify sales ────────────────────────────────
export const notifySales = (contractId) =>
  request(`/contracts/${contractId}/notify-sales`, { method: "POST" });

// ── Approved Agreements ───────────────────────────────────
export const getApprovedAgreements = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/contracts/approved-agreements${qs ? `?${qs}` : ""}`);
};

export const downloadApprovedPdf = async (contractId, filename) => {
  const res = await fetch(`${BASE}/contracts/${contractId}/approved-pdf`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`PDF download failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const fromHeader = parseFilenameFromContentDisposition(
    res.headers.get("content-disposition"),
  );
  a.download =
    filename ||
    fromHeader ||
    `RG_Addendum_${contractId.replace(/-/g, "").slice(0, 8).toUpperCase()}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ── RateBot ───────────────────────────────────────────────
export const ratebotChat = (data) =>
  request("/ratebot/chat", { method: "POST", body: JSON.stringify(data) });
