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
    const isProduction = process.env.NODE_ENV === 'production';

    Cookies.set('access_token', accessToken, {
      expires: expiryDate,
      secure: isProduction, // Only use secure in production
      sameSite: 'strict',
    });
    Cookies.set('refresh_token', refreshToken, {
      expires: 30,
      secure: isProduction, // Only use secure in production
      sameSite: 'strict',
    }); // 30 days
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

        console.log('Attempting token refresh...');
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

          console.log('Token refreshed successfully, retrying original request');
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.warn('Token refresh failed:', refreshError);
        tokenManager.clearTokens();

        // Only redirect to login if we're not already there
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          console.log('Redirecting to login due to authentication failure');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Log other API errors for debugging (but only in development)
    if (error.response?.status && process.env.NODE_ENV === 'development') {
      // Use a more gentle logging approach that won't trigger React error boundaries
      const errorInfo = {
        status: error.response.status,
        url: error.config?.url,
        data: error.response.data,
      };

      // Only log non-404 errors or 404s that aren't expected dataset checks
      const isExpected404 =
        error.response.status === 404 &&
        (error.config?.url?.includes('/dinsight/') ||
          error.config?.url?.includes('/organizations'));

      if (!isExpected404) {
        console.warn('API Error:', errorInfo);
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
    getSessions: () => apiClient.get('/users/sessions'),
    revokeSession: (sessionId: string) => apiClient.delete(`/users/sessions/${sessionId}`),
    revokeAllSessions: () => apiClient.delete('/users/sessions'),
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
        // Never time out large baseline uploads; processing is polled separately
        timeout: 0,
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
        // Never time out large monitoring uploads; UI will handle progress/polling
        timeout: 0,
      });
    },
    get: (dinsightId: number) => apiClient.get(`/monitor/${dinsightId}`),
    getCoordinates: (dinsightId: number) => apiClient.get(`/monitor/${dinsightId}/coordinates`),
    getAvailable: () => apiClient.get('/monitor/available'),
    getForBaseline: (baselineId: number) => apiClient.get(`/monitor/baseline/${baselineId}`),
  },

  // Anomaly detection endpoints
  anomaly: {
    detect: (data: any) => {
      console.log('🔍 Calling anomaly detection API with data:', data);
      return apiClient.post('/anomaly/detect', data);
    },
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

  // Streaming endpoints
  streaming: {
    getStatus: (baselineId: number) => apiClient.get(`/streaming/${baselineId}/status`),
    getLatestPoints: (baselineId: number, params?: { limit?: number; offset?: number }) =>
      apiClient.get(`/streaming/${baselineId}/latest`, { params }),
    reset: (baselineId: number) => apiClient.delete(`/streaming/${baselineId}/reset`),
  },
};

export default apiClient;
export { apiClient };
