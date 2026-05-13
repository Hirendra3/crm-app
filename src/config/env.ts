import {Platform} from 'react-native';
import Config from 'react-native-config';

const fallback = 'https://api-crm.oneninelabs.com';

const raw =
  (Config && Config.API_BASE_URL) ||
  'https://api-crm.oneninelabs.com';

export function getApiBaseUrl(): string {
  const trimmed = String(raw || '').trim().replace(/\/$/, '');
  return trimmed.length > 0 ? trimmed : fallback;
}
