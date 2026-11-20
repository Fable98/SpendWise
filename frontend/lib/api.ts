import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const isAuthPage = path.startsWith('/login') || path.startsWith('/register');
        const isAuthCheck = error.config?.url?.includes('/auth/me');

        if (!isAuthPage && !isAuthCheck) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
