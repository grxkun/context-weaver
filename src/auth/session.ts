import type { AuthenticationResult } from "@azure/msal-node";

let currentSession: AuthenticationResult | null = null;

export function setSession(result: AuthenticationResult): void {
  currentSession = result;
}

export function getSession(): AuthenticationResult | null {
  return currentSession;
}

export function getAccessToken(): string {
  if (!currentSession?.accessToken) {
    throw new Error("Not authenticated. Run the auth flow first.");
  }

  // Check expiry
  if (currentSession.expiresOn && currentSession.expiresOn.getTime() < Date.now()) {
    throw new Error("Access token expired. Please re-authenticate.");
  }

  return currentSession.accessToken;
}

export function clearSession(): void {
  currentSession = null;
}
