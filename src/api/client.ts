import axios, { AxiosError } from 'axios';
import { getApiBaseUrl } from '../config/env';
import { getSessionToken, triggerUnauthorized } from './accessors';

export { setSessionAccessors } from './accessors';

export const api = axios.create({
  baseURL: getApiBaseUrl(),
});

api.interceptors.request.use(cfg => {
  const token = getSessionToken();
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

api.interceptors.response.use(
  res => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      triggerUnauthorized();
    }
    return Promise.reject(err);
  },
);

export function extractApiError(err: unknown): string {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : String(err);
  }
  const data = err.response?.data as { error?: unknown } | undefined;
  if (typeof data?.error === 'string') {
    return data.error;
  }
  return err.message || 'Request failed.';
}
