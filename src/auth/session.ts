import EncryptedStorage from 'react-native-encrypted-storage';

const TOKEN_KEY = 'office-crm-mobile-token';
const USER_KEY = 'office-crm-mobile-user';

export async function loadStoredSession(): Promise<{
  token: string | null;
  userJson: string | null;
}> {
  const [token, userJson] = await Promise.all([
    EncryptedStorage.getItem(TOKEN_KEY),
    EncryptedStorage.getItem(USER_KEY),
  ]);
  return {token, userJson};
}

export async function saveSession(token: string, userJson: string): Promise<void> {
  await EncryptedStorage.setItem(TOKEN_KEY, token);
  await EncryptedStorage.setItem(USER_KEY, userJson);
}

export async function clearSession(): Promise<void> {
  await EncryptedStorage.removeItem(TOKEN_KEY);
  await EncryptedStorage.removeItem(USER_KEY);
}
