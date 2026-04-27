export function setDocumentFavicon(url?: string) {
  const faviconUrl = String(url || '').trim();
  if (!faviconUrl || typeof document === 'undefined') return;

  let faviconLink =
    document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (!faviconLink) {
    faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    document.head.appendChild(faviconLink);
  }

  faviconLink.href = faviconUrl;
}
