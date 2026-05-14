/** Paths where 401 must not trigger global logout (same idea as crm-web api client). */
export function isCredentialAuthRequest(url: string | undefined): boolean {
  const path = String(url ?? '').split('?')[0];
  return path.includes('/auth/login');
}
