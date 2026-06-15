const STORAGE_KEY = "nuvelle_list";

function getLocalStorage(): Storage | undefined {
  if (typeof localStorage === "undefined") {
    return undefined;
  }

  return localStorage;
}

function uniqueSlugs(slugs: string[]): string[] {
  return Array.from(new Set(slugs));
}

export function getSavedDramas(): string[] {
  const storage = getLocalStorage();

  if (!storage) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) || "[]");

    if (!Array.isArray(parsed)) {
      return [];
    }

    return uniqueSlugs(parsed.filter((slug): slug is string => typeof slug === "string"));
  } catch {
    return [];
  }
}

export function setSavedDramas(slugs: string[]): void {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(uniqueSlugs(slugs)));
}

export function isSavedDrama(slug: string): boolean {
  return getSavedDramas().includes(slug);
}

export function toggleSavedDrama(slug: string): string[] {
  const current = getSavedDramas();
  const next = current.includes(slug) ? current.filter((savedSlug) => savedSlug !== slug) : [...current, slug];
  const uniqueNext = uniqueSlugs(next);

  setSavedDramas(uniqueNext);

  return uniqueNext;
}
