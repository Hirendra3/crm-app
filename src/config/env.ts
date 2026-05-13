import {NativeModules} from 'react-native';

const fallback = 'https://api-crm.oneninelabs.com';

type EnvConfig = {API_BASE_URL?: string};

function readNativeConfig(): EnvConfig {
  type RNCModule = {
    getConfig?: () => {config?: EnvConfig & Record<string, unknown>};
  };
  const rnc = NativeModules.RNCConfigModule as RNCModule | undefined;
  if (typeof rnc?.getConfig === 'function') {
    try {
      const res = rnc.getConfig();
      if (res?.config && typeof res.config === 'object') {
        return res.config as EnvConfig;
      }
    } catch {
      // fall through
    }
  }

  try {
    // TurboModule path (New Architecture). On old arch, `index.js` throws
    // because `TurboModuleRegistry.get` returns null — bridge path above avoids that.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-config') as {default?: EnvConfig};
    return mod.default ?? {};
  } catch {
    return {};
  }
}

const nativeEnv = readNativeConfig();

const raw =
  (nativeEnv && nativeEnv.API_BASE_URL) ||
  'https://api-crm.oneninelabs.com';

export function getApiBaseUrl(): string {
  const trimmed = String(raw || '').trim().replace(/\/$/, '');
  return trimmed.length > 0 ? trimmed : fallback;
}
