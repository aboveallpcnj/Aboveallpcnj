// The exact owner-supplied SociableKIT embed lives in index.html.
// Keep the original carousel until the external widget has review content.
export function waitForSociableKitWidget() {
  const mount = document.getElementById('google-review-widget');
  if (!mount) return Promise.resolve(false);
  return new Promise(resolve => {
    let settled = false;
    let observedShadow;
    const hasContent = () => {
      const widget = mount.querySelector('.sk-ww-google-reviews');
      // SociableKIT renders its cards in an open shadow root. Its light DOM
      // contains only a loader, even after the actual reviews are visible.
      const root = widget?.shadowRoot;
      if (root && root !== observedShadow) {
        observer.observe(root, { childList: true, subtree: true });
        observedShadow = root;
      }
      return Boolean(root?.querySelector('[data-testid="sk-review-card"]'));
    };
    const finish = ready => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      observer.disconnect();
      if (!ready) mount.hidden = true;
      resolve(ready);
    };
    const observer = new MutationObserver(() => { if (hasContent()) finish(true); });
    const timeout = setTimeout(() => finish(false), 20000);
    observer.observe(mount, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-sk-ready'] });
    if (hasContent()) finish(true);
  });
}
