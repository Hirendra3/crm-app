let onUnauthorized: (() => void) | undefined;
let getToken: () => string | null = () => null;

export function setSessionAccessors(opts: {
  getToken: () => string | null;
  onUnauthorized?: () => void;
}) {
  getToken = opts.getToken;
  onUnauthorized = opts.onUnauthorized;
}

export function getSessionToken() {
  return getToken();
}

export function triggerUnauthorized() {
  onUnauthorized?.();
}
