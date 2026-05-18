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

/**
 * Single-flight refresh. Both the 401 interceptor and AuthHydrator's proactive
 * boot-time refresh go through this — the mutex guarantees a single in-flight
 * POST /auth/refresh. Without this, two parallel refresh calls race and the
 * loser's rotated refresh token gets invalidated, forcing a spurious logout.
 */
export async function refreshAccessToken(): Promise<string> {
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }
  isRefreshing = true;
  try {
    const { data } = await axios.post(
      `${API_URL}/api/auth/refresh`,
      {},
      { withCredentials: true },
    );
    tokenStore.set(data.accessToken);
    processQueue(null, data.accessToken);
    return data.accessToken;
  } catch (err) {
    processQueue(err, null);
    throw err;
  } finally {
    isRefreshing = false;
  }
}

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
      const msg = error.response?.data?.message;
      if (msg === 'ACCOUNT_BLOCKED' || (typeof msg === 'string' && msg.includes('ACCOUNT_BLOCKED'))) {
        tokenStore.clear();
        await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true }).catch(() => {});
        if (typeof window !== 'undefined') {
          try { localStorage.removeItem('auth-store'); } catch {}
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      try {
        const accessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (err: any) {
        tokenStore.clear();
        if (typeof window !== 'undefined') {
          // Don't redirect if already on an auth page (prevents loops)
          const onAuthPage = window.location.pathname.match(/^\/(login|register|forgot-password|reset-password)/);
          if (!onAuthPage) {
            // Always call logout first so middleware cookie is cleared (prevents /login → /dashboard loop)
            await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true }).catch(() => {});
            // Clear persisted auth so login page doesn't immediately redirect back to dashboard
            try { localStorage.removeItem('auth-store'); } catch {}
            window.location.href = '/login';
          }
        }
        return Promise.reject(err);
      }
    }
    // Global 403 handler — role mismatch or forbidden
    if (error.response?.status === 403) {
      const msg403 = error.response?.data?.message;
      if (typeof window !== 'undefined' && msg403) {
        const { toast } = await import('sonner');
        toast.error(typeof msg403 === 'string' ? msg403 : 'Nu ai permisiunea necesară');
      }
    }

    // Global 429 handler — rate limiting
    if (error.response?.status === 429) {
      if (typeof window !== 'undefined') {
        const { toast } = await import('sonner');
        toast.error('Prea multe cereri. Te rugăm să aștepți câteva secunde.');
      }
    }

    return Promise.reject(error);
  },
);

export default api;
