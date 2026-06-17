import type { AdminUser } from "@/types/drama";

const AUTH_STATE_KEY = "nuvelle_admin_auth";

export type AuthState = {
  token: string;
  user: AdminUser | null;
};

const defaultAuthState: AuthState = {
  token: "",
  user: null
};

function getLocalStorage(): Storage | undefined {
  if (typeof localStorage === "undefined") {
    return undefined;
  }

  return localStorage;
}

function normalizeAuthState(value: unknown): AuthState {
  if (typeof value !== "object" || value === null) {
    return defaultAuthState;
  }

  const state = value as Partial<AuthState>;
  const token = typeof state.token === "string" ? state.token : "";
  const user = state.user && typeof state.user === "object" ? state.user : null;

  return { token, user };
}

export function loadAuthState(): AuthState {
  const storage = getLocalStorage();

  if (!storage) {
    return defaultAuthState;
  }

  try {
    return normalizeAuthState(JSON.parse(storage.getItem(AUTH_STATE_KEY) || "null"));
  } catch {
    return defaultAuthState;
  }
}

export function saveAuthState(state: AuthState): void {
  getLocalStorage()?.setItem(AUTH_STATE_KEY, JSON.stringify(normalizeAuthState(state)));
}

export function clearAuthState(): void {
  getLocalStorage()?.removeItem(AUTH_STATE_KEY);
}
