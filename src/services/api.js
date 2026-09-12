const API_URL = (import.meta.env.VITE_API_BASE || "http://localhost:4000/api/v1").replace(/\/$/, "");
const ACCESS_TOKEN_KEY = "videotube_access_token";
const REFRESH_TOKEN_KEY = "videotube_refresh_token";

export const authStorage = {
  get accessToken() { return localStorage.getItem(ACCESS_TOKEN_KEY); },
  get refreshToken() { return localStorage.getItem(REFRESH_TOKEN_KEY); },
  save({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function errorMessage(payload, fallback) {
  if (typeof payload === "string" && payload.trim()) return payload;
  return payload?.message || payload?.error || payload?.errors?.[0]?.message || fallback;
}

async function refreshAccessToken() {
  const refreshToken = authStorage.refreshToken;
  if (!refreshToken) return false;
  const response = await fetch(`${API_URL}/users/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) { authStorage.clear(); return false; }
  const payload = await response.json();
  const tokens = payload?.data || payload;
  authStorage.save(tokens);
  return Boolean(tokens?.accessToken);
}

export async function apiRequest(path, options = {}, canRetry = true) {
  const { body, headers = {}, ...rest } = options;
  const requestHeaders = new Headers(headers);
  const isFormData = body instanceof FormData;
  const token = authStorage.accessToken;
  if (!isFormData && body !== undefined && !requestHeaders.has("Content-Type")) requestHeaders.set("Content-Type", "application/json");
  if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...rest, headers: requestHeaders, credentials: "include", body: isFormData || typeof body === "string" || body === undefined ? body : JSON.stringify(body) });
  if (response.status === 401 && canRetry && !path.includes("/refresh-token")) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiRequest(path, options, false);
  }
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) throw new ApiError(errorMessage(payload, `Request failed with status ${response.status}`), response.status);
  return payload;
}

export function unwrap(payload) { return payload?.data ?? payload; }
export function getList(payload) {
  const data = unwrap(payload);
  return Array.isArray(data) ? data : data?.docs || [];
}
