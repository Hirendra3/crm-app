import {Platform} from 'react-native';
import Config from 'react-native-config';

const fallback =
  Platform.OS === 'android' ? 'http://10.0.2.2:3090' : 'http://127.0.0.1:3090';

const raw =
  Config.API_BASE_URL ||
  '';

export function getApiBaseUrl(): string {
  const trimmed = String(raw || '').trim().replace(/\/$/, '');
  return trimmed.length > 0 ? trimmed : fallback;
}
