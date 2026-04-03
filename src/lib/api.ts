import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ── In-memory token store (NOT sessionStorage/localStorage) ─────────────────
// sessionStorage is readable by any XSS payload on the same origin.
// An in-memory variable is only accessible to this module's code.
// On page refresh the variable resets to null → the 401 interceptor automatically
// fetches a new token via the httpOnly refresh cookie (transparent to the user).
let _accessToken: string | null = null;

export const tokenStore = {
  get: () => _accessToken,
  set: (t: string | null) => { _accessToken = t; },
  clear: () => { _accessToken = null; },
};

// Attach access token from memory (never from sessionStorage)
api.interceptors.request.use((config) => {
  if (_accessToken) config.headers.Authorization = `Bearer ${_accessToken}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't attempt refresh for login/register (they don't have tokens)
      if (originalRequest.url?.match(/\/auth\/(login|register|forgot-password|reset-password)/)) {
        return Promise.reject(error);
      }

      // Account blocked — don't attempt refresh, force logout immediately
      if (error.response?.data?.message === 'ACCOUNT_BLOCKED') {
        tokenStore.clear();
        await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true }).catch(() => {});
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post(
          `${API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true },
        );
        tokenStore.set(data.accessToken);
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (err: any) {
        processQueue(err, null);
        tokenStore.clear();
        // Don't redirect if already on an auth page (prevents loops)
        const onAuthPage = window.location.pathname.match(/^\/(login|register|forgot-password|reset-password)/);
        if (!onAuthPage) {
          // Always call logout first so middleware cookie is cleared (prevents /login → /dashboard loop)
          await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true }).catch(() => {});
          window.location.href = '/login';
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export default api;
