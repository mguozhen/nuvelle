import { DEFAULT_BACKEND_URL, normalizeBackendUrl } from "@/lib/backend";
import type { VoteVerdict } from "@/types/drama";

const ADMIN_STATE_KEY = "nuvelle_admin_state";
const BACKEND_URL_KEY = "nuvelle_promo_backend";

export type GeneratedPromo = {
  id?: string;
  title?: string;
  sourceUrl?: string;
  teaserUrl?: string;
  coverUrl?: string;
  caption?: string;
  episode?: number;
  duration?: number;
  prompt?: string;
  status?: string;
  createdAt?: number;
};

export type AdminState = {
  loggedIn: boolean;
  votes: Record<string, VoteVerdict>;
  generated: GeneratedPromo[];
};

const defaultState: AdminState = {
  loggedIn: false,
  votes: {},
  generated: []
};

function getLocalStorage(): Storage | undefined {
  if (typeof localStorage === "undefined") {
    return undefined;
  }

  return localStorage;
}

function normalizeState(value: unknown): AdminState {
  if (typeof value !== "object" || value === null) {
    return defaultState;
  }

  const state = value as Partial<AdminState>;

  return {
    loggedIn: Boolean(state.loggedIn),
    votes: state.votes && typeof state.votes === "object" ? state.votes : {},
    generated: Array.isArray(state.generated) ? state.generated : []
  };
}

export function loadAdminState(): AdminState {
  const storage = getLocalStorage();

  if (!storage) {
    return defaultState;
  }

  try {
    return normalizeState(JSON.parse(storage.getItem(ADMIN_STATE_KEY) || "null"));
  } catch {
    return defaultState;
  }
}

export function saveAdminState(state: AdminState): void {
  getLocalStorage()?.setItem(ADMIN_STATE_KEY, JSON.stringify(normalizeState(state)));
}

export function clearAdminState(): void {
  getLocalStorage()?.removeItem(ADMIN_STATE_KEY);
}

export function loadBackendUrl(): string {
  return normalizeBackendUrl(getLocalStorage()?.getItem(BACKEND_URL_KEY) || DEFAULT_BACKEND_URL);
}

export function saveBackendUrl(url: string): void {
  getLocalStorage()?.setItem(BACKEND_URL_KEY, normalizeBackendUrl(url));
}
