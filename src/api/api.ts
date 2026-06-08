// src/api/api.ts
import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import type { UnknownAction } from '@reduxjs/toolkit';
import { clearAuth, setAccessToken } from '../store/slices/authSlice';

// A strict structural interface for the slice fields we care about reading dynamically
interface SharedStoreStructure {
  getState: () => {
    auth: {
      accessToken: string | null;
    };
  };
  dispatch: (action: UnknownAction) => UnknownAction; // Safely typed using RTK core action signatures
}

// Replace the 'any' flag with our structural interface signature safely
let storeRef: SharedStoreStructure | null = null;

export const injectStore = (store: SharedStoreStructure): void => {
  storeRef = store;
};

interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

/* ============================================================
   1. REQUEST INTERCEPTOR
============================================================ */
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = storeRef?.getState().auth.accessToken;
    
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ============================================================
   2. RESPONSE INTERCEPTOR (AUTOMATIC TOKEN REFRESH)
============================================================ */
// src/api/api.ts
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    const isRefreshRequest = originalRequest.url?.includes('/auth/refresh-token');

    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshRequest) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(
          `${axiosClient.defaults.baseURL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = response.data;

        if (storeRef) {
          storeRef.dispatch(setAccessToken(accessToken) as UnknownAction);
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return axiosClient(originalRequest as InternalAxiosRequestConfig);
      } catch (refreshError) {
        if (storeRef) {
          storeRef.dispatch(clearAuth() as UnknownAction);
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;