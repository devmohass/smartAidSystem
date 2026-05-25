// SmartAid endpoint helpers, grouped by resource. Each returns the unwrapped
// payload (.data) except where pagination metadata is also useful.
import {apiRequest} from "./client.js";

export const authApi = {
  // auth=false: a failed login must NOT trigger the global 401 logout handler.
  login: (email, password) =>
    apiRequest("/auth/login", {method: "POST", body: {email, password}, auth: false}).then((r) => r.data),
  me: () => apiRequest("/auth/me").then((r) => r.data),
};

export const dashboardApi = {
  get: () => apiRequest("/dashboard").then((r) => r.data),
};

export const beneficiariesApi = {
  // Returns { data, pagination, filters }. Pass { q, limit, offset }.
  list: (query) => apiRequest("/beneficiaries", {query}),
  create: (body) => apiRequest("/beneficiaries", {method: "POST", body}).then((r) => r.data),
  update: (id, body) => apiRequest(`/beneficiaries/${id}`, {method: "PUT", body}).then((r) => r.data),
  remove: (id) => apiRequest(`/beneficiaries/${id}`, {method: "DELETE"}),
};

export const campaignsApi = {
  list: () => apiRequest("/campaigns").then((r) => r.data),
  create: (body) => apiRequest("/campaigns", {method: "POST", body}).then((r) => r.data),
  summary: (id) => apiRequest(`/campaigns/${id}/summary`).then((r) => r.data),
  changeStatus: (id, status) =>
    apiRequest(`/campaigns/${id}/status`, {method: "PUT", body: {status}}).then((r) => r.data),
};

export const transactionsApi = {
  // Returns { data, pagination, filters }. Pass { campaign_id, shop_id, status, q, limit, offset }.
  list: (query) => apiRequest("/transactions", {query}),
};

export const shopsApi = {
  // Returns { data, pagination, filters }; rows include tx_count + total_disbursed.
  list: (query) => apiRequest("/shops", {query}),
  create: (body) => apiRequest("/shops", {method: "POST", body}).then((r) => r.data),
  update: (id, body) => apiRequest(`/shops/${id}`, {method: "PUT", body}).then((r) => r.data),
  remove: (id) => apiRequest(`/shops/${id}`, {method: "DELETE"}),
  managers: (id) => apiRequest(`/shops/${id}/managers`).then((r) => r.data),
};

export const reportsApi = {
  // Returns { data, pagination, filters } — keep the envelope for pagination.
  transactions: (query) => apiRequest("/reports/transactions", {query}),
  campaigns: () => apiRequest("/reports/campaigns").then((r) => r.data),
};

export const usersApi = {
  list: () => apiRequest("/users").then((r) => r.data),
};
