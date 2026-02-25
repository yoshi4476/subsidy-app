// API通信ユーティリティ

import { API_BASE } from "./config";

// 汎用fetch関数
async function fetchAPI(endpoint: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API Error");
  }
  if (res.status === 204) return null;
  return res.json();
}

// ============================================================
// 企業 API
// ============================================================
export async function getCompanies() {
  return fetchAPI("/companies/");
}
export async function getCompany(id: string) {
  return fetchAPI(`/companies/${id}`);
}
export async function getFinancials(companyId: string) {
  return fetchAPI(`/companies/${companyId}/financials`);
}
export async function getHRData(companyId: string) {
  return fetchAPI(`/companies/${companyId}/hr`);
}
export async function getProfile(companyId: string) {
  return fetchAPI(`/companies/${companyId}/profile`);
}

// ============================================================
// 補助金 API
// ============================================================
export async function getSubsidies(status?: string) {
  const q = status ? `?status=${status}` : "";
  return fetchAPI(`/subsidies/${q}`);
}
export async function getSubsidy(id: string) {
  return fetchAPI(`/subsidies/${id}`);
}
export async function matchSubsidies(companyId: string) {
  return fetchAPI(`/subsidies/match/${companyId}`);
}
export async function approveSubsidy(id: string) {
  return fetchAPI(`/subsidies/${id}/approve`, { method: "POST" });
}

// ============================================================
// 事例 API
// ============================================================
export async function getCases(result?: string) {
  const q = result ? `?result=${result}` : "";
  return fetchAPI(`/cases${q}`);
}
export async function getCaseStats() {
  return fetchAPI("/cases/stats/summary");
}

// ============================================================
// 用語辞書 API
// ============================================================
export async function getTerms() {
  return fetchAPI("/terms");
}
export async function getTerm(termName: string) {
  return fetchAPI(`/terms/${encodeURIComponent(termName)}`);
}

// ============================================================
// 監査ログ API
// ============================================================
export async function getAuditLogs(limit = 50) {
  return fetchAPI(`/audit-logs?limit=${limit}`);
}
