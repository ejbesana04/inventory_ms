const AUTH_SESSION_EXPIRED = "auth:session-expired";

export function dispatchSessionExpired(): void {
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED));
}

export function onSessionExpired(handler: () => void): () => void {
  window.addEventListener(AUTH_SESSION_EXPIRED, handler);
  return () => window.removeEventListener(AUTH_SESSION_EXPIRED, handler);
}
