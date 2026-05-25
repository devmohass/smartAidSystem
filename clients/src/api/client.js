// SmartAid API client.
//
// The backend wraps success responses as { data: ... } (paginated list
// endpoints add sibling { pagination, filters } keys) and errors as
// { error: "...", details? }. apiRequest() returns the parsed JSON as-is so
// callers can read .data (and .pagination where relevant); errors are thrown
// as ApiError so screens can show res.message / res.status uniformly.

const TOKEN_KEY = "smartaid_token";

// Same-origin "/api" by default (works behind the Vite dev proxy and when the
// backend serves the built client). Set VITE_API_URL to point at a separately
// hosted API, e.g. "https://api.smartaid.example".
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "/api";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function buildQuery(query) {
  if (!query) return "";
  const usp = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") usp.append(k, v);
  });
  const s = usp.toString();
  return s ? `?${s}` : "";
}

export async function apiRequest(path, {method = "GET", body, query, auth = true} = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}${buildQuery(query)}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the server. Is the backend running?", 0);
  }

  if (res.status === 204) return null;

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    // A 401 anywhere except the login attempt means our token is gone/expired.
    if (res.status === 401 && auth) {
      window.dispatchEvent(new CustomEvent("smartaid:unauthorized"));
    }
    const message = json?.error || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, json?.details);
  }

  return json;
}
