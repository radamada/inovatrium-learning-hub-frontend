import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token from memory
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
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
        sessionStorage.removeItem('access_token');
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
        sessionStorage.setItem('access_token', data.accessToken);
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (err: any) {
        processQueue(err, null);
        sessionStorage.removeItem('access_token');
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
