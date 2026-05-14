import axios, { AxiosError } from 'axios';
import { getApiBaseUrl } from '../config/env';
import { getSessionToken, triggerUnauthorized } from './accessors';
import { isCredentialAuthRequest } from './authPaths';

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
    const status = err.response?.status;
    const url = err.config?.url;
    if (status === 401 && !isCredentialAuthRequest(url)) {
      triggerUnauthorized();
    }
    return Promise.reject(err);
  },
);

export function extractApiError(err: unknown): string {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : String(err);
  }
  const raw = err.response?.data as { error?: unknown } | undefined;
  const e = raw?.error;
  if (typeof e === 'string' && e.trim()) return e.trim();
  if (e && typeof e === 'object') {
    const flat = e as { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
    const parts: string[] = [];
    if (Array.isArray(flat.formErrors)) parts.push(...flat.formErrors);
    if (flat.fieldErrors && typeof flat.fieldErrors === 'object') {
      for (const [, msgs] of Object.entries(flat.fieldErrors)) {
        if (Array.isArray(msgs)) parts.push(...msgs.filter(m => typeof m === 'string'));
      }
    }
    if (parts.length > 0) return parts.join('. ');
  }
  return err.message || 'Request failed.';
}
