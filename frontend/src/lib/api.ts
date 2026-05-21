import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse, AuthResponse } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor — attach access token ─────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const workspaceId = localStorage.getItem('workspace_id');
    if (workspaceId && config.headers) {
      config.headers['x-workspace-id'] = workspaceId;
    }
  }
  return config;
});

// ─── Response interceptor — silent 401 → refresh ──────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const { data } = await axios.post<ApiResponse<AuthResponse>>(
          `${API_BASE}/auth/refresh`,
          { refreshToken },
        );
        const { accessToken } = data.data;
        localStorage.setItem('access_token', accessToken);
        if (original.headers) original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login', { email, password }),
  register: (name: string, email: string, password: string, workspaceName: string) =>
    api.post<ApiResponse<AuthResponse>>('/auth/register', { name, email, password, workspaceName }),
  refresh: (refreshToken: string) =>
    api.post<ApiResponse<AuthResponse>>('/auth/refresh', { refreshToken }),
};

// ─── Dashboard ────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getCharts: () => api.get('/dashboard/charts'),
};

// ─── Workspaces ───────────────────────────────────────────────────────────
export const workspacesApi = {
  list: () => api.get('/workspaces'),
  create: (name: string, slug: string) => api.post('/workspaces', { name, slug }),
  delete: (id: string) => api.delete(`/workspaces/${id}`),
};

// ─── Leads ────────────────────────────────────────────────────────────────
export const leadsApi = {
  list: (params?: Record<string, unknown>) => api.get('/leads', { params }),
  get: (id: string) => api.get(`/leads/${id}`),
  create: (data: Record<string, unknown>) => api.post('/leads', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/leads/${id}`, data),
  delete: (id: string) => api.delete(`/leads/${id}`),
  bulkImport: (leads: unknown[]) => api.post('/leads/bulk', { leads }),
};

// ─── Calls ────────────────────────────────────────────────────────────────
export const callsApi = {
  list: (params?: Record<string, unknown>) => api.get('/calls', { params }),
  get: (id: string) => api.get(`/calls/${id}`),
  dispatch: (leadId: string) => api.post('/calls/dispatch', { leadId }),
};

// ─── Agent Configs ────────────────────────────────────────────────────────
export const agentApi = {
  list: () => api.get('/agent/configs'),
  get: (id: string) => api.get(`/agent/configs/${id}`),
  getActive: () => api.get('/agent/active'),
  generate: () => api.post('/agent/generate'),
  activate: (id: string) => api.post(`/agent/configs/${id}/activate`),
};

// ─── Business ─────────────────────────────────────────────────────────────
export const businessApi = {
  get: () => api.get('/business/context'),
  save: (data: Record<string, unknown>) => api.post('/business/context', data),
  uploadDocument: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/business/documents', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─── Learning ─────────────────────────────────────────────────────────────
export const learningApi = {
  getInsights: () => api.get('/learning/insights'),
  triggerLearning: () => api.post('/learning/run'),
  getHistory: () => api.get('/learning/history'),
};

export default api;
