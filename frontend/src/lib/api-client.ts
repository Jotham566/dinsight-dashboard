import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { ApiResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Token management
export const tokenManager = {
  getAccessToken: () => Cookies.get('access_token'),
  getRefreshToken: () => Cookies.get('refresh_token'),
  setTokens: (accessToken: string, refreshToken: string, expiresIn: number) => {
    const expiryDate = new Date(new Date().getTime() + expiresIn * 1000);
    Cookies.set('access_token', accessToken, {
      expires: expiryDate,
      secure: true,
      sameSite: 'strict',
    });
    Cookies.set('refresh_token', refreshToken, { expires: 30, secure: true, sameSite: 'strict' }); // 30 days
  },
  clearTokens: () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
  },
};

// Request interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenManager.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<any>>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = tokenManager.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, expires_in } = response.data.data;
        const currentRefreshToken = tokenManager.getRefreshToken();

        if (currentRefreshToken) {
          tokenManager.setTokens(access_token, currentRefreshToken, expires_in);
          onTokenRefreshed(access_token);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }

          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        tokenManager.clearTokens();
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// API methods
export const api = {
  // Auth endpoints
  auth: {
    login: (data: { email: string; password: string; remember_me?: boolean }) =>
      apiClient.post('/auth/login', data),
    register: (data: {
      email: string;
      password: string;
      full_name: string;
      organization_code?: string;
    }) => apiClient.post('/auth/register', data),
    logout: () => apiClient.post('/auth/logout'),
    forgotPassword: (email: string) => apiClient.post('/auth/forgot-password', { email }),
    resetPassword: (token: string, password: string) =>
      apiClient.post('/auth/reset-password', { token, password }),
    refresh: (refreshToken: string) =>
      apiClient.post('/auth/refresh', { refresh_token: refreshToken }),
  },

  // User endpoints
  users: {
    getProfile: () => apiClient.get('/users/profile'),
    updateProfile: (data: { full_name?: string; email?: string }) =>
      apiClient.put('/users/profile', data),
    changePassword: (currentPassword: string, newPassword: string) =>
      apiClient.post('/users/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      }),
  },

  // Organization endpoints
  organizations: {
    list: () => apiClient.get('/organizations'),
    get: (id: number) => apiClient.get(`/organizations/${id}`),
    create: (data: any) => apiClient.post('/organizations', data),
    update: (id: number, data: any) => apiClient.put(`/organizations/${id}`, data),
    delete: (id: number) => apiClient.delete(`/organizations/${id}`),
  },

  // Machine endpoints
  machines: {
    list: (
      orgId: number,
      params?: { status?: string; location?: string; limit?: number; offset?: number }
    ) => apiClient.get(`/orgs/${orgId}/machines`, { params }),
    get: (id: number) => apiClient.get(`/machines/${id}`),
    create: (orgId: number, data: any) => apiClient.post(`/orgs/${orgId}/machines`, data),
    update: (id: number, data: any) => apiClient.put(`/machines/${id}`, data),
    delete: (id: number) => apiClient.delete(`/machines/${id}`),
  },

  // Analysis endpoints
  analysis: {
    upload: (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      return apiClient.post('/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    getConfig: () => apiClient.get('/config'),
    updateConfig: (config: any) => apiClient.post('/config', config),
    getDinsight: (id: number) => apiClient.get(`/dinsight/${id}`),
    getFeatures: (fileUploadId: number) => apiClient.get(`/feature/${fileUploadId}`),
    getFeatureRange: (fileUploadId: number, start: number, end: number) =>
      apiClient.get(`/feature/${fileUploadId}/range`, { params: { start, end } }),
  },

  // Monitoring endpoints
  monitoring: {
    upload: (dinsightId: number, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.post(`/monitor/${dinsightId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    get: (dinsightId: number) => apiClient.get(`/monitor/${dinsightId}`),
    getCoordinates: (dinsightId: number) => apiClient.get(`/monitor/${dinsightId}/coordinates`),
    getAvailable: () => apiClient.get('/monitor/available'),
    getForBaseline: (baselineId: number) => apiClient.get(`/monitor/baseline/${baselineId}`),
  },

  // Anomaly detection endpoints
  anomaly: {
    detect: (data: any) => apiClient.post('/anomaly/detect', data),
    detectWithStorage: (data: any) => apiClient.post('/anomaly/detect-with-storage', data),
    getThreshold: (datasetId: number) => apiClient.get(`/anomaly/threshold/${datasetId}`),
  },

  // Alert endpoints
  alerts: {
    createRule: (data: any) => apiClient.post('/alerts/rules', data),
    getRules: (orgId: number) => apiClient.get(`/alerts/rules/organization/${orgId}`),
    getAlerts: (
      orgId: number,
      params?: { status?: string; severity?: string; machine_id?: number; limit?: number }
    ) => apiClient.get(`/alerts/organization/${orgId}`, { params }),
    acknowledge: (id: number) => apiClient.post(`/alerts/${id}/acknowledge`),
    resolve: (id: number) => apiClient.post(`/alerts/${id}/resolve`),
  },

  // Dataset endpoints
  datasets: {
    createMetadata: (data: any) => apiClient.post('/datasets/metadata', data),
    getMetadata: (datasetId: number) => apiClient.get(`/datasets/${datasetId}/metadata`),
    getLineage: (datasetId: number) => apiClient.get(`/datasets/${datasetId}/lineage`),
    getExampleTypes: () => apiClient.get('/example-datasets/types'),
    loadExample: (data: { dataset_type: string; organization_id: number; machine_id: number }) =>
      apiClient.post('/example-datasets/load', data),
  },

  // Validation endpoints
  validation: {
    createRule: (data: any) => apiClient.post('/data-validation/rules', data),
    validate: (data: { dataset_id: number; validation_rule_ids: number[] }) =>
      apiClient.post('/data-validation/validate', data),
  },

};

export default apiClient;
export { apiClient };
