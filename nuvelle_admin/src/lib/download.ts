export function startBrowserDownload(url: string, filename?: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noreferrer";
  link.style.display = "none";
  if (filename) {
    link.download = filename;
  }

  document.body.appendChild(link);
  link.click();
  link.remove();
}
