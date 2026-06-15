const STORAGE_KEY = "nuvelle_boost";

export type BoostLink = {
  slug: string;
  title: string;
};

export type BoostState = {
  email: string;
  handle: string;
  code: string;
  links: BoostLink[];
};

function getLocalStorage(): Storage | undefined {
  if (typeof localStorage === "undefined") {
    return undefined;
  }

  return localStorage;
}

function isBoostLink(value: unknown): value is BoostLink {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as BoostLink).slug === "string" &&
    typeof (value as BoostLink).title === "string"
  );
}

function normalizeLinks(links: unknown): BoostLink[] {
  if (!Array.isArray(links)) {
    return [];
  }

  const seen = new Set<string>();
  return links.filter(isBoostLink).filter((link) => {
    if (seen.has(link.slug)) {
      return false;
    }

    seen.add(link.slug);
    return true;
  });
}

export function loadBoostState(): BoostState | null {
  const storage = getLocalStorage();

  if (!storage) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) || "null");

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as BoostState).email !== "string" ||
      typeof (parsed as BoostState).code !== "string"
    ) {
      return null;
    }

    return {
      email: (parsed as BoostState).email,
      handle: typeof (parsed as BoostState).handle === "string" ? (parsed as BoostState).handle : "",
      code: (parsed as BoostState).code,
      links: normalizeLinks((parsed as BoostState).links)
    };
  } catch {
    return null;
  }
}

export function saveBoostState(state: BoostState): void {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify({ ...state, links: normalizeLinks(state.links) }));
}

export function clearBoostState(): void {
  getLocalStorage()?.removeItem(STORAGE_KEY);
}
