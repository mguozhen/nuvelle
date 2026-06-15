export function registerServiceWorker(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

export function isIosDevice(userAgent?: string): boolean {
  const agent = userAgent ?? (typeof navigator === "undefined" ? "" : navigator.userAgent);

  return /iphone|ipad|ipod/i.test(agent);
}
