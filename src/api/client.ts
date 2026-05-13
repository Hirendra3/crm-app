import axios, { AxiosError } from 'axios';
import { getApiBaseUrl } from '../config/env';

let onUnauthorized: (() => void) | undefined;
let getToken: () => string | null = () => null;

export function setSessionAccessors(opts: {
  getToken: () => string | null;
  onUnauthorized?: () => void;
}) {
  getToken = opts.getToken;
  onUnauthorized = opts.onUnauthorized;
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
});

api.interceptors.request.use(cfg => {
  const token = getToken();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  res => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      onUnauthorized?.();
    }
    return Promise.reject(err);
  },
);

export function extractApiError(err: unknown): string {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : String(err);
  }
  const data = err.response?.data as { error?: unknown } | undefined;
  if (typeof data?.error === 'string') return data.error;
  return err.message || 'Request failed.';
}
